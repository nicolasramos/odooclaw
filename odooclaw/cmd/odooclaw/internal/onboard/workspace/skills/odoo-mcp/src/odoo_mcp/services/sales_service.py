from typing import Any, cast

from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("sales_service")


def find_sale_order(
    client: OdooClient,
    user_id: int,
    name: str | None = None,
    partner_id: int | None = None,
    state: str | None = None,
    limit: int = 10,
) -> list:
    domain: list[tuple[str, str, Any]] = []
    if name:
        domain.append(("name", "ilike", name))
    if partner_id:
        domain.append(("partner_id", "=", partner_id))
    if state:
        domain.append(("state", "=", state))

    _logger.info(f"Finding sale orders with domain: {domain}")
    return cast(
        list[Any],
        client.call_kw(
            "sale.order",
            "search_read",
            args=[domain],
            kwargs={
                "fields": [
                    "id",
                    "name",
                    "partner_id",
                    "state",
                    "amount_total",
                    "date_order",
                ],
                "limit": limit,
            },
            sender_id=user_id,
        ),
    )


def get_sale_order_summary(client: OdooClient, user_id: int, order_id: int) -> dict:
    orders = client.call_kw(
        "sale.order",
        "read",
        args=[[order_id]],
        kwargs={
            "fields": [
                "name",
                "partner_id",
                "state",
                "amount_untaxed",
                "amount_tax",
                "amount_total",
                "order_line",
                "user_id",
                "invoice_status",
            ]
        },
        sender_id=user_id,
    )
    if not orders:
        return {"error": "Sale order not found"}

    order = orders[0]
    lines_info = []
    if order.get("order_line"):
        lines = client.call_kw(
            "sale.order.line",
            "read",
            args=[order["order_line"]],
            kwargs={
                "fields": [
                    "product_id",
                    "name",
                    "product_uom_qty",
                    "price_unit",
                    "price_subtotal",
                ]
            },
            sender_id=user_id,
        )
        for line in lines:
            lines_info.append(
                {
                    "product": (
                        line.get("product_id")[1] if line.get("product_id") else line.get("name")
                    ),
                    "qty": line.get("product_uom_qty"),
                    "price": line.get("price_unit"),
                    "subtotal": line.get("price_subtotal"),
                }
            )

    return {
        "id": order["id"],
        "name": order["name"],
        "partner": order.get("partner_id")[1] if order.get("partner_id") else None,
        "salesperson": order.get("user_id")[1] if order.get("user_id") else None,
        "state": order.get("state"),
        "invoice_status": order.get("invoice_status"),
        "untaxed": order.get("amount_untaxed"),
        "tax": order.get("amount_tax"),
        "total": order.get("amount_total"),
        "lines": lines_info,
    }


def create_sale_order(client: OdooClient, sender_id: int, partner_id: int, lines: list) -> int:
    """Create a new sale.order with the provided lines."""
    order_vals: dict[str, Any] = {"partner_id": partner_id, "order_line": []}

    for line in lines:
        line_vals = {
            "product_id": line.product_id,
            "product_uom_qty": line.product_uom_qty,
        }
        if line.price_unit is not None:
            line_vals["price_unit"] = line.price_unit

        # Odoo format for creation in one2many: (0, 0, values_dict)
        order_vals["order_line"].append((0, 0, line_vals))

    order_id = client.call_kw("sale.order", "create", args=[order_vals], sender_id=sender_id)
    return cast(int, order_id)


def confirm_sale_order(client: OdooClient, sender_id: int, order_id: int) -> bool:
    """Confirm a sale.order (moves it from draft/sent to sale)."""
    # Equivalent to clicking "Confirm" button
    client.call_kw("sale.order", "action_confirm", args=[[order_id]], sender_id=sender_id)
    return True


def create_invoice_from_sale_order(
    client: OdooClient,
    user_id: int,
    order_id: int,
    invoice_date: str | None = None,
) -> dict:
    """Creates the customer invoice for a confirmed sale order.

    Odoo 18 refuses remote calls to private methods, so sale.order._create_invoices
    cannot be reached over RPC. The invoice is built from the order lines instead:
    product, quantity, price, discount and taxes are copied, so the accounting
    amounts match what the customer was quoted.
    """
    orders = client.call_kw(
        "sale.order",
        "read",
        args=[[order_id]],
        kwargs={"fields": ["name", "partner_id", "state", "invoice_status", "order_line"]},
        sender_id=user_id,
    )
    if not orders:
        return {"error": "Sale order not found"}

    order = orders[0]
    if order.get("state") not in ("sale", "done"):
        return {
            "error": "Sale order {} is in state '{}'; confirm it before invoicing".format(
                order.get("name"), order.get("state")
            )
        }
    if order.get("invoice_status") == "invoiced":
        return {"error": "Sale order {} is already invoiced".format(order.get("name"))}

    line_ids = order.get("order_line") or []
    if not line_ids:
        return {"error": "Sale order {} has no lines".format(order.get("name"))}

    lines = client.call_kw(
        "sale.order.line",
        "read",
        args=[line_ids],
        kwargs={
            "fields": [
                "product_id",
                "name",
                "product_uom_qty",
                "price_unit",
                "discount",
                "tax_id",
            ]
        },
        sender_id=user_id,
    )

    invoice_lines = []
    for line in lines:
        invoice_lines.append(
            (
                0,
                0,
                {
                    "product_id": (line["product_id"][0] if line.get("product_id") else False),
                    "name": line.get("name") or "",
                    "quantity": line.get("product_uom_qty") or 1,
                    "price_unit": line.get("price_unit") or 0.0,
                    "discount": line.get("discount") or 0.0,
                    "tax_ids": [(6, 0, line.get("tax_id") or [])],
                },
            )
        )

    values = {
        "move_type": "out_invoice",
        "partner_id": order["partner_id"][0],
        "invoice_origin": order.get("name"),
        "invoice_line_ids": invoice_lines,
    }
    if invoice_date:
        values["invoice_date"] = invoice_date

    move_id = client.call_kw("account.move", "create", args=[values], kwargs={}, sender_id=user_id)
    created = client.call_kw(
        "account.move",
        "read",
        args=[move_id],
        kwargs={"fields": ["name", "amount_total", "state", "move_type", "partner_id"]},
        sender_id=user_id,
    )
    data = created[0] if created else {}

    _logger.info("Created invoice %s from sale order %s", move_id, order.get("name"))
    return {
        "id": move_id,
        "name": data.get("name") or "(draft)",
        "amount_total": data.get("amount_total"),
        "state": data.get("state"),
        "move_type": data.get("move_type"),
        "partner": data["partner_id"][1] if data.get("partner_id") else None,
        "origin": order.get("name"),
    }
