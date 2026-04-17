from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("purchase_service")

def create_purchase_order(client: OdooClient, user_id: int, partner_id: int, lines: list) -> int:
    """
    Creates a purchase order with multiple lines.
    lines format: [{"product_id": 1, "product_qty": 2.0, "price_unit": 100.0}]
    """
    order_vals = {
        "partner_id": partner_id,
        "order_line": []
    }
    
    for line in lines:
        order_vals["order_line"].append((0, 0, {
            "product_id": line["product_id"],
            "product_qty": line.get("product_qty", 1.0),
            "price_unit": line.get("price_unit", 0.0)
        }))
        
    _logger.info(f"Creating PO for partner {partner_id} with {len(lines)} lines")
    return client.call_kw("purchase.order", "create", args=[order_vals], sender_id=user_id)
