from pydantic import Field

from .common import BaseOdooRequest


class OdooInvokeActionSchema(BaseOdooRequest):
    model: str = Field(..., description="The Odoo model")
    method: str = Field(
        ..., description="Workflow action name (must start with action_ or button_)"
    )
    ids: list[int] = Field(..., description="Record IDs to process")
