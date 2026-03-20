from typing import Optional, List, Dict, Any
from pydantic import Field
from .common import BaseOdooRequest

class FindPartnerSchema(BaseOdooRequest):
    name: str = Field(..., description="Name of the partner to find or create")
    vat: Optional[str] = Field(None, description="Tax ID (VAT)")
    email: Optional[str] = Field(None, description="Email address")

class POLineSchema(BaseOdooRequest):
    product_id: int = Field(..., description="ID of the product")
    product_qty: float = Field(1.0, description="Quantity")
    price_unit: float = Field(0.0, description="Unit price")

class CreatePurchaseOrderSchema(BaseOdooRequest):
    partner_id: int = Field(..., description="ID of the vendor")
    lines: List[POLineSchema] = Field(..., description="Lines to add to the order")

class InvoiceLineSchema(BaseOdooRequest):
    product_id: Optional[int] = Field(None, description="Product ID (if any)")
    name: str = Field("Item", description="Label/Description for the line")
    quantity: float = Field(1.0, description="Quantity")
    price_unit: float = Field(0.0, description="Unit price")

class CreateVendorInvoiceSchema(BaseOdooRequest):
    partner_id: int = Field(..., description="ID of the vendor")
    ref: str = Field("", description="Vendor Reference string")
    lines: List[InvoiceLineSchema] = Field(..., description="Invoice lines")

class GetPartnerSummarySchema(BaseOdooRequest):
    partner_id: int = Field(..., description="Partner ID to summarize")

class CreateActivitySchema(BaseOdooRequest):
    model: str = Field(..., description="Target model name (e.g. res.partner, sale.order)")
    res_id: int = Field(..., description="Target record ID")
    summary: str = Field(..., description="Short summary of the activity")
    note: Optional[str] = Field(None, description="Detailed note or instructions")
    user_id: Optional[int] = Field(None, description="Assign to specific user (default: caller)")

class ListPendingActivitiesSchema(BaseOdooRequest):
    model: Optional[str] = Field(None, description="Filter by model")
    user_id: Optional[int] = Field(None, description="Filter by assigned user")
    
class MarkActivityDoneSchema(BaseOdooRequest):
    activity_id: int = Field(..., description="The ID of the mail.activity to mark done")
    feedback: Optional[str] = Field(None, description="Feedback text regarding completion")

class PostChatterMessageSchema(BaseOdooRequest):
    model: str = Field(..., description="Target model name")
    res_id: int = Field(..., description="Target record ID")
    body: str = Field(..., description="Message content (HTML format supported)")

class FindTaskSchema(BaseOdooRequest):
    name: Optional[str] = Field(None, description="Task name search")
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    stage_id: Optional[int] = Field(None, description="Filter by stage ID")
    limit: int = Field(10, description="Max results")

class CreateTaskSchema(BaseOdooRequest):
    name: str = Field(..., description="Task name")
    project_id: Optional[int] = Field(None, description="Project ID")
    description: Optional[str] = Field(None, description="Task details")
    assigned_to: Optional[int] = Field(None, description="Assign to user ID")
    deadline: Optional[str] = Field(None, description="Deadline format YYYY-MM-DD")

class UpdateTaskSchema(BaseOdooRequest):
    task_id: int = Field(..., description="Task ID to update")
    stage_id: Optional[int] = Field(None, description="Move to new stage ID")
    assigned_to: Optional[int] = Field(None, description="Re-assign to user ID")
    deadline: Optional[str] = Field(None, description="Change deadline format YYYY-MM-DD")

class FindSaleOrderSchema(BaseOdooRequest):
    name: Optional[str] = Field(None, description="Sales order reference/name")
    partner_id: Optional[int] = Field(None, description="Filter by customer ID")
    state: Optional[str] = Field(None, description="Filter by state (draft, sent, sale, done, cancel)")
    limit: int = Field(10, description="Max results")

class GetSaleOrderSummarySchema(BaseOdooRequest):
    order_id: int = Field(..., description="The ID of the sale.order")

class GetRecordSummarySchema(BaseOdooRequest):
    model: str = Field(..., description="The Odoo model")
    res_id: int = Field(..., description="The record ID")


class FindPendingInvoicesSchema(BaseOdooRequest):
    partner_id: Optional[int] = Field(None, description="Filter by partner/customer ID. Use odoo_find_partner first if you only have a name.")
    move_type: str = Field(
        "out_invoice",
        description="Invoice type: 'out_invoice'=customer invoice (factura cliente), 'in_invoice'=vendor bill (factura proveedor), 'out_refund'=customer credit note, 'in_refund'=vendor credit note"
    )
    limit: int = Field(50, description="Max results")


class GetInvoiceSummarySchema(BaseOdooRequest):
    move_id: int = Field(..., description="The ID of the account.move (invoice)")


class GetModelSchemaSchema(BaseOdooRequest):
    model: str = Field(..., description="The Odoo model to introspect, e.g., 'res.partner', 'account.move'. Use this to list fields and field types for a model if you are unsure.")
