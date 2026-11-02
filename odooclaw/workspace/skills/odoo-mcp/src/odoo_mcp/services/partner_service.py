from typing import cast

from odoo_mcp.core.client import OdooClient
from odoo_mcp.core.field_schema import (
    drop_empty_fields,
    get_field_schema,
    read_summary_record,
    select_summary_fields,
)
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("partner_service")


def _normalize_partner_name(name: str | None) -> str | None:
    if not name:
        return None
    normalized = " ".join(name.split())
    return normalized or None


def _search_partner_id(client: OdooClient, user_id: int, domain: list) -> int | None:
    partners = client.call_kw(
        "res.partner",
        "search_read",
        args=[domain],
        kwargs={"fields": ["id", "name", "email", "vat"], "limit": 1},
        sender_id=user_id,
    )
    if partners:
        return cast(int | None, partners[0]["id"])
    return None


def find_existing_partner_id(
    client: OdooClient,
    user_id: int,
    name: str | None = None,
    vat: str | None = None,
    email: str | None = None,
    allow_fuzzy_name: bool = False,
) -> int | None:
    normalized_name = _normalize_partner_name(name)

    if vat:
        partner_id = _search_partner_id(client, user_id, [("vat", "=", vat)])
        if partner_id:
            return partner_id

    if email:
        partner_id = _search_partner_id(client, user_id, [("email", "=", email)])
        if partner_id:
            return partner_id

    if normalized_name:
        # Case-insensitive match on the FULL normalized name only (=ilike is
        # ILIKE without surrounding wildcards): "Acme SL" matches "acme sl",
        # but NOT "Acme SL Holdings". Deliberately not accent-folding, to avoid
        # colliding distinct partners ("César" vs "Cesar" stay separate).
        partner_id = _search_partner_id(client, user_id, [("name", "=ilike", normalized_name)])
        if partner_id:
            return partner_id

    if normalized_name and allow_fuzzy_name:
        return _search_partner_id(client, user_id, [("name", "ilike", normalized_name)])

    return None


def find_partner(
    client: OdooClient,
    user_id: int,
    name: str,
    vat: str | None = None,
    email: str | None = None,
) -> int | None:
    partner_id = find_existing_partner_id(
        client,
        user_id,
        name=name,
        vat=vat,
        email=email,
        allow_fuzzy_name=True,
    )
    if partner_id:
        _logger.info(f"Found existing partner: {partner_id}")
    return partner_id


def find_or_create_partner(
    client: OdooClient,
    user_id: int,
    name: str,
    vat: str | None = None,
    email: str | None = None,
) -> int:
    partner_id = find_existing_partner_id(
        client,
        user_id,
        name=name,
        vat=vat,
        email=email,
        allow_fuzzy_name=False,
    )
    if partner_id:
        _logger.info(f"Reusing existing partner: {partner_id}")
        return partner_id

    values = {"name": _normalize_partner_name(name) or name}
    if vat:
        values["vat"] = vat
    if email:
        values["email"] = email

    _logger.info(f"Creating new partner: {values['name']}")
    return cast(int, client.call_kw("res.partner", "create", args=[values], sender_id=user_id))


def _count_or_none(client: OdooClient, user_id: int, model: str, domain: list) -> int | None:
    """``search_count`` for *model*, or ``None`` when this instance lacks it.

    ``sale`` and ``account`` are optional modules: on an instance without them
    the model does not exist and Odoo answers with a JSON-RPC error. A summary
    must report "unknown" for that document count, never fail because of it.
    """
    if not get_field_schema(client, model, user_id):
        return None
    try:
        return cast(
            int | None, client.call_kw(model, "search_count", args=[domain], sender_id=user_id)
        )
    except Exception as exc:  # noqa: BLE001 - a count must not sink the summary
        _logger.info(f"search_count on {model} failed: {exc}")
        return None


def get_partner_summary(client: OdooClient, user_id: int, partner_id: int) -> dict:
    """Gets a clean summary: this partner's real fields plus open documents.

    The field list is discovered from the instance (``fields_get``, cached 60s)
    instead of the six names that used to be hardcoded: ``mobile``, ``street``,
    ``city``, ``title`` and any custom field are reported because they exist,
    not because someone remembered to add them (issue #81).

    Guards that keep the summary usable everywhere:

    * ``credit`` / ``debit`` only exist where ``account`` is installed — when
      they do, they are folded into ``financial_balance``; when they do not,
      the balance is simply absent instead of the whole call raising
      ``ValueError: Invalid field 'credit'``;
    * the open document counts come back as ``None`` when ``sale`` /
      ``account`` are not installed;
    * empty values are dropped, so the caller sees what is actually filled in.
    """
    _logger.info(f"Getting partner summary for id {partner_id}")
    fields = select_summary_fields(client, "res.partner", user_id)
    partner = read_summary_record(client, "res.partner", partner_id, fields, user_id)
    if partner is None:
        return {"error": "Partner not found"}

    summary = drop_empty_fields(partner)
    if "id" not in summary:
        summary["id"] = partner_id

    # credit / debit exist only with accounting: fold them into one balance.
    if "credit" in partner and "debit" in partner:
        summary.pop("credit", None)
        summary.pop("debit", None)
        summary["financial_balance"] = partner["credit"] - partner["debit"]

    # Backward-compatible alias for the salesperson the old shape exposed.
    user = partner.get("user_id")
    if user and "salesperson" not in summary:
        summary["salesperson"] = (
            user[1] if isinstance(user, (list, tuple)) and len(user) > 1 else user
        )

    summary["open_sale_orders"] = _count_or_none(
        client,
        user_id,
        "sale.order",
        [("partner_id", "=", partner_id), ("state", "not in", ["cancel", "done"])],
    )
    summary["open_invoices"] = _count_or_none(
        client,
        user_id,
        "account.move",
        [
            ("partner_id", "=", partner_id),
            ("state", "=", "posted"),
            ("payment_state", "in", ["not_paid", "partial"]),
        ],
    )
    return summary
