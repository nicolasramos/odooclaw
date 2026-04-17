from typing import Dict, List, Optional, Union
from pydantic import Field
from .common import BaseOdooRequest
from odoo_mcp.config import DEFAULT_SEARCH_LIMIT

# OdooDomainTerm: either a logical operator ("&", "|", "!") or a 3-element
# condition tuple [field, operator, value]. Using a concrete Union avoids
# bare `Any` which crashes LMStudio grammar compilation.
OdooDomainTerm = Union[str, List[Union[str, int, float, bool, None]]]
OdooFieldValue = Union[str, int, float, bool, None]

class OdooSearchSchema(BaseOdooRequest):
    model: str = Field(..., description="The Odoo model to search (e.g. res.partner, sale.order)")
    domain: List[OdooDomainTerm] = Field(
        default_factory=list,
        description='Domain filter. Each condition is [field, op, value]. E.g. [["customer_rank",">",0]]'
    )
    limit: int = Field(DEFAULT_SEARCH_LIMIT, description="Max records to return")

class OdooReadSchema(BaseOdooRequest):
    model: str = Field(..., description="The Odoo model")
    ids: List[int] = Field(..., description="IDs to read")
    fields: Optional[List[str]] = Field(None, description="List of fields to return. Omit for all fields.")

class OdooSearchReadSchema(OdooSearchSchema):
    fields: Optional[List[str]] = None

class OdooCreateSchema(BaseOdooRequest):
    model: str = Field(..., description="Model name")
    values: Dict[str, OdooFieldValue] = Field(..., description="Field-value pairs for the new record")

class OdooWriteSchema(BaseOdooRequest):
    model: str = Field(..., description="Model name")
    ids: List[int] = Field(..., description="Target record IDs")
    values: Dict[str, OdooFieldValue] = Field(..., description="Field-value pairs to update")
