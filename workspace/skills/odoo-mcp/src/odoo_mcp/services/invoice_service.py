from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("invoice_service")


def create_vendor_invoice(client: OdooClient, user_id: int, partner_id: int, lines: list, ref: str = "") -> int:
    """Creates a vendor invoice (account.move of type in_invoice)."""
    invoice_vals = {
        "move_type": "in_invoice",
        "partner_id": partner_id,
        "ref": ref,
        "invoice_line_ids": []
    }

    for line in lines:
        invoice_vals["invoice_line_ids"].append((0, 0, {
            "product_id": line.get("product_id"),
            "name": line.get("name", "Item"),
            "quantity": line.get("quantity", 1.0),
            "price_unit": line.get("price_unit", 0.0)
        }))

    _logger.info(f"Creating vendor invoice for partner {partner_id} with {len(lines)} lines")
    return client.call_kw("account.move", "create", args=[invoice_vals], sender_id=user_id)


def find_pending_invoices(client: OdooClient, user_id: int, partner_id: int = None,
                          move_type: str = "out_invoice", limit: int = 50) -> list:
    """
    Find invoices pending payment in Odoo 18.

    IMPORTANT - Odoo 18 account.move states (NOT Odoo 13):
      state field: 'draft' | 'posted' | 'cancel'
        - 'open' is NOT valid in Odoo 18 (was valid up to Odoo 13)
        - posted = confirmed/validated invoice
      payment_state field: 'not_paid' | 'partial' | 'in_payment' | 'paid' | 'reversed'
        - not_paid = no payment made
        - partial = partially paid, still has residual amount

    Pending payment = state='posted' AND payment_state in ('not_paid', 'partial')

    move_type values:
      'out_invoice' = customer invoice (factura de cliente)
      'in_invoice'  = vendor bill (factura de proveedor)
      'out_refund'  = customer credit note
      'in_refund'   = vendor credit note
    """
    domain = [
        ["state", "=", "posted"],
        ["payment_state", "in", ["not_paid", "partial"]],
        ["move_type", "=", move_type],
    ]
    if partner_id:
        domain.append(["partner_id", "=", partner_id])

    fields = ["id", "name", "partner_id", "invoice_date", "invoice_date_due",
              "amount_total", "amount_residual", "payment_state", "state", "move_type", "ref"]

    _logger.info(f"Finding pending invoices: move_type={move_type}, partner_id={partner_id}")
    return client.call_kw(
        "account.move", "search_read",
        args=[domain],
        kwargs={"fields": fields, "limit": limit, "order": "invoice_date_due asc"},
        sender_id=user_id
    )


def get_invoice_summary(client: OdooClient, user_id: int, move_id: int) -> dict:
    """Get a complete summary of a specific invoice (account.move)."""
    fields = ["id", "name", "move_type", "state", "payment_state",
              "partner_id", "invoice_date", "invoice_date_due",
              "amount_untaxed", "amount_tax", "amount_total", "amount_residual",
              "ref", "invoice_line_ids", "currency_id"]

    records = client.call_kw(
        "account.move", "search_read",
        args=[[["id", "=", move_id]]],
        kwargs={"fields": fields, "limit": 1},
        sender_id=user_id
    )

    if not records:
        return {"error": f"Invoice {move_id} not found"}

    invoice = records[0]

    # Fetch invoice lines
    if invoice.get("invoice_line_ids"):
        lines = client.call_kw(
            "account.move.line", "search_read",
            args=[[["move_id", "=", move_id], ["display_type", "=", "product"]]],
            kwargs={"fields": ["name", "quantity", "price_unit", "price_subtotal", "tax_ids"]},
            sender_id=user_id
        )
        invoice["lines"] = lines

    return invoice
