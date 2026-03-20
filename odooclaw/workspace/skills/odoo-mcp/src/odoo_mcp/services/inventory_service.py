from typing import Any, Dict, List, Optional
from odoo_mcp.core.client import OdooClient
import logging

_logger = logging.getLogger(__name__)

def get_product_stock(
    client: OdooClient,
    sender_id: int,
    product_id: int,
    location_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Get stock availability for a product."""
    domain = [("product_id", "=", product_id)]
    if location_id:
        domain.append(("location_id", "=", location_id))
    
    # Check if stock.quant exists, otherwise fallback or error
    try:
        fields = ["location_id", "quantity", "reserved_quantity"]
        # In newer Odoo versions 'available_quantity' is also present but let's stick to base ones to be safe
        quants = client.call_kw(
            "stock.quant",
            "search_read",
            sender_id=sender_id,
            args=[domain],
            kwargs={"fields": fields}
        )
        return quants
    except Exception as e:
        _logger.error(f"Error fetching stock for product {product_id}: {e}")
        raise
