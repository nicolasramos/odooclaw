from typing import Optional
from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("partner_service")


def _normalize_partner_name(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    normalized = " ".join(name.split())
    return normalized or None


def _search_partner_id(client: OdooClient, user_id: int, domain: list) -> Optional[int]:
    partners = client.call_kw(
        "res.partner",
        "search_read",
        args=[domain],
        kwargs={"fields": ["id", "name", "email", "vat"], "limit": 1},
        sender_id=user_id,
    )
    if partners:
        return partners[0]["id"]
    return None


def find_existing_partner_id(
    client: OdooClient,
    user_id: int,
    name: Optional[str] = None,
    vat: Optional[str] = None,
    email: Optional[str] = None,
    allow_fuzzy_name: bool = False,
) -> Optional[int]:
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
        partner_id = _search_partner_id(
            client, user_id, [("name", "=", normalized_name)]
        )
        if partner_id:
            return partner_id

    if normalized_name and allow_fuzzy_name:
        return _search_partner_id(client, user_id, [("name", "ilike", normalized_name)])

    return None


def find_partner(
    client: OdooClient,
    user_id: int,
    name: str,
    vat: Optional[str] = None,
    email: Optional[str] = None,
) -> Optional[int]:
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
    vat: Optional[str] = None,
    email: Optional[str] = None,
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
    return client.call_kw("res.partner", "create", args=[values], sender_id=user_id)


def get_partner_summary(client: OdooClient, user_id: int, partner_id: int) -> dict:
    """Gets a clean summary including basics, commercial, open documents count."""
    partner = client.call_kw(
        "res.partner",
        "read",
        args=[[partner_id]],
        kwargs={"fields": ["name", "email", "phone", "user_id", "credit", "debit"]},
        sender_id=user_id,
    )
    if not partner:
        return {"error": "Partner not found"}

    p = partner[0]
    # Check open sale orders roughly
    so_count = client.call_kw(
        "sale.order",
        "search_count",
        args=[
            [("partner_id", "=", partner_id), ("state", "not in", ["cancel", "done"])]
        ],
        sender_id=user_id,
    )
    inv_count = client.call_kw(
        "account.move",
        "search_count",
        args=[
            [
                ("partner_id", "=", partner_id),
                ("state", "=", "posted"),
                ("payment_state", "in", ["not_paid", "partial"]),
            ]
        ],
        sender_id=user_id,
    )

    return {
        "id": p["id"],
        "name": p["name"],
        "email": p.get("email"),
        "phone": p.get("phone"),
        "salesperson": p.get("user_id")[1] if p.get("user_id") else None,
        "financial_balance": p.get("credit", 0) - p.get("debit", 0),
        "open_sale_orders": so_count,
        "open_invoices": inv_count,
    }
