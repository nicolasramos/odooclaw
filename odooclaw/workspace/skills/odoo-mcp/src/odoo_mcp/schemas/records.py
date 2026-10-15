from pydantic import Field

from odoo_mcp.config import DEFAULT_SEARCH_LIMIT

from .common import BaseOdooRequest

# OdooDomainTerm: either a logical operator ("&", "|", "!") or a 3-element
# condition tuple [field, operator, value]. Using a concrete Union avoids
# bare `Any` which crashes LMStudio grammar compilation.
OdooDomainTerm = str | list[str | int | float | bool | None]
OdooFieldValue = str | int | float | bool | None


class OdooSearchSchema(BaseOdooRequest):
    model: str = Field(..., description="The Odoo model to search (e.g. res.partner, sale.order)")
    domain: list[OdooDomainTerm] = Field(
        default_factory=list,
        description='Domain filter. Each condition is [field, op, value]. E.g. [["customer_rank",">",0]]',
    )
    limit: int = Field(DEFAULT_SEARCH_LIMIT, description="Max records to return")


class OdooReadSchema(BaseOdooRequest):
    model: str = Field(..., description="The Odoo model")
    ids: list[int] = Field(..., description="IDs to read")
    fields: list[str] | None = Field(
        None, description="List of fields to return. Omit for all fields."
    )


class OdooSearchReadSchema(OdooSearchSchema):
    fields: list[str] | None = None


class OdooCreateSchema(BaseOdooRequest):
    model: str = Field(..., description="Model name")
    values: dict[str, OdooFieldValue] = Field(
        ..., description="Field-value pairs for the new record"
    )


class OdooWriteSchema(BaseOdooRequest):
    model: str = Field(..., description="Model name")
    ids: list[int] = Field(..., description="Target record IDs")
    values: dict[str, OdooFieldValue] = Field(..., description="Field-value pairs to update")
