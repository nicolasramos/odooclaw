from odoo_mcp.core.client import OdooClient
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access, guard_write_fields
from odoo_mcp.services.sales_service import (
    create_invoice_from_sale_order,
    find_sale_order,
    get_sale_order_summary,
)


def odoo_find_sale_order(
    client: OdooClient,
    user_id: int,
    name: str | None = None,
    partner_id: int | None = None,
    state: str | None = None,
    limit: int = 10,
) -> list:
    guard_model_access("sale.order")
    return find_sale_order(client, user_id, name, partner_id, state, limit)


def odoo_get_sale_order_summary(client: OdooClient, user_id: int, order_id: int) -> dict:
    guard_model_access("sale.order")
    audit_action("GET_SO_SUMMARY", user_id, "sale.order", [order_id], {})
    return get_sale_order_summary(client, user_id, order_id)


def odoo_create_invoice_from_sale_order(
    client: OdooClient,
    user_id: int,
    order_id: int,
    invoice_date: str | None = None,
) -> dict:
    """Invoices a confirmed sale order, copying its lines into an out_invoice."""
    guard_model_access("sale.order")
    guard_model_access("account.move")
    audit_action(
        "CREATE_INVOICE_FROM_SO",
        user_id,
        "sale.order",
        [order_id],
        {"invoice_date": invoice_date},
    )
    return create_invoice_from_sale_order(client, user_id, order_id, invoice_date)


def _resolve_name(client: OdooClient, user_id: int, model: str, value: str) -> int:
    matches = client.call_kw(
        model, "name_search", args=[value], kwargs={"operator": "ilike", "limit": 6}, sender_id=user_id
    ) or []
    exact = [match for match in matches if str(match[1]).lower() == value.lower()]
    if exact:
        return exact[0][0]
    if len(matches) == 1:
        return matches[0][0]
    if not matches:
        raise ValueError(f"no {model} matches {value!r}")
    names = ", ".join(str(match[1]) for match in matches[:5])
    raise ValueError(f"{value!r} matches several {model}: {names}")


def odoo_create_sale_order(
    client: OdooClient,
    user_id: int,
    partner_id: int | None,
    lines: list,
    partner_name: str | None = None,
    note: str | None = None,
) -> dict:
    """Create a quotation from scratch: the partner and the lines are enough.

    The caller names the customer and the products the way a person does; names are
    resolved here and the one2many order_line is built with the right command shape.
    """
    try:
        guard_model_access("sale.order", client, sender_id=user_id)
        if not partner_id:
            if not partner_name:
                return {"ok": False, "error": "partner_id or partner_name is required"}
            partner_id = _resolve_name(client, user_id, "res.partner", partner_name)
        if not lines:
            return {"ok": False, "error": "at least one line is required"}
        order_lines = []
        for line in lines:
            product = line.get("product_id") or line.get("product")
            if product is None:
                return {"ok": False, "error": "every line needs product_id (id or name)"}
            if isinstance(product, str):
                product = _resolve_name(client, user_id, "product.product", product)
            quantity = line.get("product_uom_qty") or line.get("product_qty") or line.get("quantity") or 1
            values = {"product_id": int(product), "product_uom_qty": float(quantity)}
            if line.get("price_unit") is not None:
                values["price_unit"] = float(line["price_unit"])
            order_lines.append((0, 0, values))
        order_values = {"partner_id": int(partner_id), "order_line": order_lines}
        if note:
            order_values["note"] = note
        guard_write_fields(order_values)
        audit_action("CREATE_SO", user_id, "sale.order", [], {"partner_id": partner_id, "lines_count": len(order_lines)})
        order_id = client.call_kw("sale.order", "create", args=[order_values], sender_id=user_id)
        record = client.call_kw(
            "sale.order",
            "read",
            args=[[order_id]],
            kwargs={"fields": ["name", "partner_id", "amount_untaxed", "amount_total", "state"]},
            sender_id=user_id,
        )
        return {"ok": True, "id": order_id, "order": record[0] if record else {}}
    except Exception as error:  # noqa: BLE001 - the model needs the reason
        return {"ok": False, "error": str(error)}
