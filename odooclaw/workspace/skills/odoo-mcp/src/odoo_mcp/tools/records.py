from typing import Any, Dict, List, Optional
from odoo_mcp.core.client import OdooClient
from odoo_mcp.security.guards import guard_model_access, guard_write_fields
from odoo_mcp.security.audit import audit_action
from odoo_mcp.core.domains import validate_domain
from odoo_mcp.core.serializers import serialize_records, RECORD_URL_KEY
from odoo_mcp.services.partner_service import find_existing_partner_id
from odoo_mcp.core.exceptions import OdooRPCError

# Cache for validated field sets: {model_name: set_of_field_names}
_field_cache: Dict[str, set] = {}
_FIELD_CACHE_TTL_SECONDS = 60.0
_field_cache_timestamps: Dict[str, float] = {}


def _get_model_fields(client: OdooClient, model: str, sender_id: int) -> set:
    """Return the set of valid field names for *model* via fields_get.

    Results are cached per model with a short TTL to avoid hammering
    ir.model.fields on every read/search_read call.
    """
    now = _field_cache_timestamps.get(model, 0.0)
    if model in _field_cache and (now - _field_cache_timestamps[model]) < _FIELD_CACHE_TTL_SECONDS:
        return _field_cache[model]

    try:
        fields_info = client.call_kw(model, "fields_get", sender_id=sender_id)
        if isinstance(fields_info, dict):
            result = set(fields_info.keys())
        else:
            result = set()
    except Exception:
        result = set()

    _field_cache[model] = result
    _field_cache_timestamps[model] = now if now else 0.0
    # Store current time properly
    import time
    _field_cache_timestamps[model] = time.monotonic()
    return result


def _validate_fields(
    client: OdooClient,
    model: str,
    fields: Optional[List[str]],
    sender_id: int,
) -> List[str]:
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
        raise OdooRPCError(
            f"unknown fields: {unknown}; valid fields for '{model}': {valid_list}"
        )

    return clean_fields


def odoo_search(
    client: OdooClient, user_id: int, model: str, domain: List[Any], limit: int
) -> List[int]:
    """Search for record IDs matching domain."""
    validate_domain(domain)
    return client.call_kw(
        model, "search", args=[domain], kwargs={"limit": limit}, sender_id=user_id
    )


def odoo_read(
    client: OdooClient,
    user_id: int,
    model: str,
    ids: List[int],
    fields: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Read fields for a list of record IDs."""
    clean = _validate_fields(client, model, fields, user_id)
    kwargs = {"fields": clean} if clean else {}
    records = client.call_kw(
        model, "read", args=[ids], kwargs=kwargs, sender_id=user_id
    )
    return serialize_records(records, model=model, base_url=client.odoo_session.url)


def odoo_search_read(
    client: OdooClient,
    user_id: int,
    model: str,
    domain: List[Any],
    fields: Optional[List[str]] = None,
    limit: int = 80,
) -> List[Dict[str, Any]]:
    """Search and read in a single call."""
    validate_domain(domain)
    clean = _validate_fields(client, model, fields, user_id)
    kwargs = {"limit": limit}
    if clean:
        kwargs["fields"] = clean
    records = client.call_kw(
        model, "search_read", args=[domain], kwargs=kwargs, sender_id=user_id
    )
    return serialize_records(records, model=model, base_url=client.odoo_session.url)


def odoo_create(
    client: OdooClient, user_id: int, model: str, values: Dict[str, Any]
) -> int:
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

    return client.call_kw(model, "create", args=[values], sender_id=user_id)


def odoo_write(
    client: OdooClient, user_id: int, model: str, ids: List[int], values: Dict[str, Any]
) -> bool:
    """Update records, respecting denylists and allowlists."""
    guard_model_access(model, client, sender_id=user_id)
    guard_write_fields(values)
    audit_action("WRITE", user_id, model, ids, values)
    return client.call_kw(model, "write", args=[ids, values], sender_id=user_id)
