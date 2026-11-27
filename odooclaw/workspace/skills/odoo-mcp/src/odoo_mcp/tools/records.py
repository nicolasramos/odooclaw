from typing import Any, cast

from odoo_mcp.core.client import OdooClient
from odoo_mcp.core.domains import validate_domain
from odoo_mcp.core.exceptions import OdooRPCError
from odoo_mcp.core.field_schema import (
    get_field_schema,
)
from odoo_mcp.core.serializers import serialize_records
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access, guard_write_fields
from odoo_mcp.services.partner_service import find_existing_partner_id

# ``_field_cache`` / ``_field_cache_timestamps`` come from
# odoo_mcp.core.field_schema: the cache is shared with the summary services, so
# one fields_get per model per 60s serves both validating a read and building a
# summary. Tests clear it through this module, the path they already use.


def _get_model_fields(client: OdooClient, model: str, sender_id: int) -> set:
    """Return the set of valid field names for *model* via fields_get.

    Results come from the shared schema cache (60s TTL), so validating a read
    and summarising a record never fetch the same schema twice.
    """
    return set(get_field_schema(client, model, sender_id))


def _validate_fields(
    client: OdooClient,
    model: str,
    fields: list[str] | None,
    sender_id: int,
) -> list[str]:
    """Validate requested fields against the model's real schema.

    Returns a cleaned list of fields ready to send to Odoo (with
    ``__``-prefixed synthetic keys removed).  Raises *OdooRPCError*
    with a helpful message when unknown fields are detected.

    Rules:
    - ``fields is None`` → no validation, caller gets all fields.
    - ``id`` is always considered valid (implicit Odoo field).
    - Fields starting with ``__`` are silently discarded (they are
      synthetic keys like ``__url`` injected by the serializer).
    """
    if fields is None:
        return []

    # 1. Strip synthetic ``__``-prefixed fields silently.
    clean_fields = [f for f in fields if not f.startswith("__")]

    # 2. If nothing left to validate, return early.
    if not clean_fields:
        return []

    # 3. Fetch real field names from the model.
    real_fields = _get_model_fields(client, model, sender_id)

    # 4. ``id`` is always valid (implicit Odoo field, may not appear
    #    in fields_get on some versions).
    known = real_fields | {"id"}

    # 5. Check each requested field.
    unknown = [f for f in clean_fields if f not in known]

    if unknown:
        valid_list = sorted(real_fields) if real_fields else []
        raise OdooRPCError(f"unknown fields: {unknown}; valid fields for '{model}': {valid_list}")

    return clean_fields


def odoo_search(
    client: OdooClient, user_id: int, model: str, domain: list[Any], limit: int
) -> list[int]:
    """Search for record IDs matching domain."""
    validate_domain(domain)
    guard_model_access(model, client, sender_id=user_id)
    return cast(
        list[int],
        client.call_kw(model, "search", args=[domain], kwargs={"limit": limit}, sender_id=user_id),
    )


def odoo_read(
    client: OdooClient,
    user_id: int,
    model: str,
    ids: list[int],
    fields: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Read fields for a list of record IDs."""
    guard_model_access(model, client, sender_id=user_id)
    clean = _validate_fields(client, model, fields, user_id)
    kwargs = {"fields": clean} if clean else {}
    records = client.call_kw(model, "read", args=[ids], kwargs=kwargs, sender_id=user_id)
    return serialize_records(records, model=model, base_url=client.odoo_session.url)


def odoo_search_read(
    client: OdooClient,
    user_id: int,
    model: str,
    domain: list[Any],
    fields: list[str] | None = None,
    limit: int = 80,
) -> list[dict[str, Any]]:
    """Search and read in a single call."""
    validate_domain(domain)
    guard_model_access(model, client, sender_id=user_id)
    clean = _validate_fields(client, model, fields, user_id)
    kwargs: dict[str, Any] = {"limit": limit}
    if clean:
        kwargs["fields"] = clean
    records = client.call_kw(model, "search_read", args=[domain], kwargs=kwargs, sender_id=user_id)
    return serialize_records(records, model=model, base_url=client.odoo_session.url)


def list_installed_modules(client: OdooClient, user_id: int) -> list[dict[str, Any]]:
    """Return installed modules as a list of dicts with id, name, state.

    This is the read-only tool for module awareness — it queries
    ir.module.module with state=installed and returns a safe,
    filtered view (id + name only).  The model itself remains in
    DEFAULT_DENIED_MODELS for write operations.
    """
    guard_model_access("ir.module.module", client, sender_id=user_id)
    domain = [("state", "=", "installed")]
    records = client.call_kw(
        "ir.module.module",
        "search_read",
        args=[domain],
        kwargs={"fields": ["id", "name"]},
        sender_id=user_id,
    )
    return cast(list[dict[str, Any]], records)


def _normalize_attachment_ids(values: dict[str, Any]) -> dict[str, Any]:
    """Coerce `attachment_ids` into the flat list of ints `message_post` requires.

    Odoo's `mail.thread.message_post` validates this field and rejects anything
    that is not literally a list of ids:

        if attachment_ids and not tools.is_list_of(attachment_ids, int):
            raise ValueError(
                _('Posting a message should receive attachments records as a '
                  'list of IDs (received %(aids)s)'))

    A model reaching for a relational field naturally emits the x2many command
    form `[(6, 0, [id])]` — and that is exactly what this check rejects. Measured
    against a real Odoo 17 (Odoo Server 17.0, ecosystem): the command form raises
    `ValueError`, the bare list returns a message with the attachment linked.

    Only rewrites what Odoo would reject; anything already valid is untouched.
    """
    if not isinstance(values, dict):
        return values
    raw = values.get("attachment_ids")
    if not raw or not isinstance(raw, list):
        return values

    ids: list[int] = []
    for item in raw:
        if isinstance(item, int) and not isinstance(item, bool):
            ids.append(item)
        elif isinstance(item, (list, tuple)):
            # x2many command: (6, 0, [ids]) / [6, 0, [ids]]
            if len(item) == 3 and item[0] == 6 and isinstance(item[2], (list, tuple)):
                ids.extend(i for i in item[2] if isinstance(i, int) and not isinstance(i, bool))
        else:
            # Unknown shape — leave the value alone rather than guess.
            return values

    if ids:
        values = dict(values)
        values["attachment_ids"] = ids
    return values


def odoo_create(client: OdooClient, user_id: int, model: str, values: dict[str, Any]) -> int:
    """Create a new record after checking allowlist."""
    guard_model_access(model, client, sender_id=user_id)
    audit_action("CREATE", user_id, model, [], values)

    if model == "res.partner":
        existing_partner_id = find_existing_partner_id(
            client,
            user_id,
            name=values.get("name"),
            vat=values.get("vat"),
            email=values.get("email"),
            allow_fuzzy_name=False,
        )
        if existing_partner_id:
            return existing_partner_id

    if model == "mail.message":
        values = _normalize_attachment_ids(values)

    return cast(int, client.call_kw(model, "create", args=[values], sender_id=user_id))


def odoo_write(
    client: OdooClient, user_id: int, model: str, ids: list[int], values: dict[str, Any]
) -> bool:
    """Update records, respecting denylists and allowlists."""
    guard_model_access(model, client, sender_id=user_id)
    guard_write_fields(values)
    audit_action("WRITE", user_id, model, ids, values)
    return cast(bool, client.call_kw(model, "write", args=[ids, values], sender_id=user_id))


def _update_field_info(schema: dict[str, Any], model: str, field: str) -> dict[str, Any]:
    info = schema.get(field)
    if not info:
        near = ", ".join(sorted(schema)[:40])
        raise ValueError(f"unknown field {field!r} on {model}; some fields: {near}")
    return info


def _resolve_update_value(
    client: OdooClient, user_id: int, model: str, field: str, value: Any, schema: dict[str, Any]
) -> Any:
    """Turn a human value (a name, a label, a number as text) into what Odoo expects."""
    info = _update_field_info(schema, model, field)
    ftype = info.get("type")
    if ftype == "many2one" and isinstance(value, str):
        relation = info.get("relation")
        if not relation:
            return value
        matches = client.call_kw(
            relation, "name_search", args=[value], kwargs={"operator": "ilike", "limit": 6}, sender_id=user_id
        ) or []
        exact = [match for match in matches if str(match[1]).lower() == value.lower()]
        if exact:
            return exact[0][0]
        if len(matches) == 1:
            return matches[0][0]
        if not matches:
            raise ValueError(f"no {relation} matches {value!r}")
        names = ", ".join(str(match[1]) for match in matches[:5])
        raise ValueError(f"{value!r} matches several {relation}: {names}")
    if ftype == "selection":
        selection = info.get("selection") or []
        for key, label in selection:
            if value == key or str(value).lower() == str(label).lower():
                return key
        labels = ", ".join(str(label) for _, label in selection)
        raise ValueError(f"{value!r} is not a valid value for {field}; options: {labels}")
    if ftype == "integer" and isinstance(value, str):
        return int(float(value))
    if ftype in ("float", "monetary") and isinstance(value, str):
        return float(value)
    if ftype == "boolean" and isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "si", "sí")
    return value


def odoo_update_by(
    client: OdooClient, user_id: int, model: str, lookup: dict[str, Any], values: dict[str, Any]
) -> dict[str, Any]:
    """Find exactly one record by simple field/value pairs and write values into it.

    The caller names a record the way a person does ("Acme, S.L.", "Pilot Product",
    category "Servicios"): many2one values are resolved with name_search, selection
    labels with fields_get, and numbers sent as text are converted. It refuses an
    ambiguous lookup instead of writing the wrong record. Errors come back as
    {"ok": false, "error": ...} so the model reads the reason and can retry.
    """
    try:
        guard_model_access(model, client, sender_id=user_id)
        guard_write_fields(values)
        schema = get_field_schema(client, model, user_id)
        if not schema:
            return {"ok": False, "error": f"no schema for {model}: unknown model or no access"}
        resolved_lookup = {
            field: _resolve_update_value(client, user_id, model, field, value, schema)
            for field, value in (lookup or {}).items()
        }
        domain = [[field, "=", value] for field, value in resolved_lookup.items()]
        ids = client.call_kw(model, "search", args=[domain], kwargs={"limit": 4}, sender_id=user_id) or []
        if not ids:
            return {"ok": False, "error": f"no {model} matches {lookup}"}
        if len(ids) > 1:
            found = client.call_kw(
                model, "read", args=[ids], kwargs={"fields": ["display_name"]}, sender_id=user_id
            ) or []
            names = ", ".join(str(record.get("display_name")) for record in found)
            return {"ok": False, "error": f"{lookup} matches {len(ids)} {model}: {names}"}
        record_id = ids[0]
        fields = ["display_name"] + [field for field in values if field != "display_name"]
        before = (
            client.call_kw(model, "read", args=[[record_id]], kwargs={"fields": fields}, sender_id=user_id)
            or [{}]
        )[0]
        clean = {
            field: _resolve_update_value(client, user_id, model, field, value, schema)
            for field, value in values.items()
        }
        audit_action("WRITE", user_id, model, [record_id], clean)
        client.call_kw(model, "write", args=[[record_id], clean], sender_id=user_id)
        after = (
            client.call_kw(model, "read", args=[[record_id]], kwargs={"fields": fields}, sender_id=user_id)
            or [{}]
        )[0]
        return {
            "ok": True,
            "model": model,
            "id": record_id,
            "display_name": before.get("display_name"),
            "before": {field: before.get(field) for field in values},
            "after": {field: after.get(field) for field in values},
        }
    except Exception as error:  # noqa: BLE001 - the model needs the reason, not a traceback
        return {"ok": False, "error": str(error)}
