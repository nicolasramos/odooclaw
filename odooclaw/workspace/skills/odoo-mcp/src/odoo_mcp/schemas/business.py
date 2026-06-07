from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
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
    confirm: bool = Field(
        False,
        description="Legacy tool is routed through validated vendor bill creation; must be true to create.",
    )
    dry_run: bool = Field(True, description="Return preview without creation by default")
    total_tolerance: float = Field(0.01, description="Allowed OCR/line total delta")
    vendor_create_policy: str = Field(
        "propose_create",
        description="Vendor creation policy: search_only, propose_create, create_with_confirm",
    )
    confirm_partner_create: bool = Field(
        False,
        description="Must be true, together with confirm=true and dry_run=false, to create a missing vendor partner",
    )


class FindPurchaseOrderSchema(BaseOdooRequest):
    name: Optional[str] = Field(None, description="Purchase order reference/name")
    partner_id: Optional[int] = Field(None, description="Vendor partner ID")
    state: Optional[str] = Field(
        None, description="Filter by state: draft, sent, to approve, purchase, done, cancel"
    )
    limit: int = Field(10, description="Max results")


class GetPurchaseOrderSummarySchema(BaseOdooRequest):
    order_id: int = Field(..., description="purchase.order ID")


class GetPurchaseReceiptStatusSchema(BaseOdooRequest):
    purchase_order_id: int = Field(..., description="purchase.order ID")


class GetPurchaseInvoiceStatusSchema(BaseOdooRequest):
    purchase_order_id: int = Field(..., description="purchase.order ID")


class SuggestVendorProductsSchema(BaseOdooRequest):
    partner_id: int = Field(..., description="Vendor partner ID")
    query: Optional[str] = Field(None, description="Optional product/vendor code search")
    limit: int = Field(10, description="Max suggestions")


class MatchVendorBillToPurchaseOrderSchema(BaseOdooRequest):
    partner_id: int = Field(..., description="Vendor partner ID")
    vendor_bill_number: Optional[str] = Field(None, description="Vendor bill reference")
    purchase_order_id: Optional[int] = Field(None, description="Known purchase.order ID")
    ocr_payload: Optional[Dict[str, Any]] = Field(
        None, description="Optional normalized OCR payload with invoice lines"
    )
    tolerance: float = Field(0.01, description="Quantity/price matching tolerance")


class GetPartnerSummarySchema(BaseOdooRequest):
    partner_id: int = Field(..., description="Partner ID to summarize")


class CreateActivitySchema(BaseOdooRequest):
    model: str = Field(
        ..., description="Target model name (e.g. res.partner, sale.order)"
    )
    res_id: int = Field(..., description="Target record ID")
    summary: str = Field(..., description="Short summary of the activity")
    note: Optional[str] = Field(None, description="Detailed note or instructions")
    user_id: Optional[int] = Field(
        None, description="Assign to specific user (default: caller)"
    )


class ListPendingActivitiesSchema(BaseOdooRequest):
    model: Optional[str] = Field(None, description="Filter by model")
    user_id: Optional[int] = Field(None, description="Filter by assigned user")


class MarkActivityDoneSchema(BaseOdooRequest):
    activity_id: int = Field(
        ..., description="The ID of the mail.activity to mark done"
    )
    feedback: Optional[str] = Field(
        None, description="Feedback text regarding completion"
    )


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
    deadline: Optional[str] = Field(
        None, description="Change deadline format YYYY-MM-DD"
    )


class FindSaleOrderSchema(BaseOdooRequest):
    name: Optional[str] = Field(None, description="Sales order reference/name")
    partner_id: Optional[int] = Field(None, description="Filter by customer ID")
    state: Optional[str] = Field(
        None, description="Filter by state (draft, sent, sale, done, cancel)"
    )
    limit: int = Field(10, description="Max results")


class GetSaleOrderSummarySchema(BaseOdooRequest):
    order_id: int = Field(..., description="The ID of the sale.order")


class GetRecordSummarySchema(BaseOdooRequest):
    model: str = Field(..., description="The Odoo model")
    res_id: int = Field(..., description="The record ID")


class FindPendingInvoicesSchema(BaseOdooRequest):
    partner_id: Optional[int] = Field(
        None,
        description="Filter by partner/customer ID. Use odoo_find_partner first if you only have a name.",
    )
    move_type: str = Field(
        "out_invoice",
        description="Invoice type: 'out_invoice'=customer invoice (factura cliente), 'in_invoice'=vendor bill (factura proveedor), 'out_refund'=customer credit note, 'in_refund'=vendor credit note",
    )
    limit: int = Field(50, description="Max results")


class GetInvoiceSummarySchema(BaseOdooRequest):
    move_id: int = Field(..., description="The ID of the account.move (invoice)")


class GetModelSchemaSchema(BaseOdooRequest):
    model: str = Field(
        ...,
        description="The Odoo model to introspect, e.g., 'res.partner', 'account.move'. Use this to list fields and field types for a model if you are unsure.",
    )


class CreateCalendarEventSchema(BaseOdooRequest):
    name: str = Field(..., description="The name or title of the event/appointment.")
    start: str = Field(
        ..., description="Start datetime in 'YYYY-MM-DD HH:MM:SS' format."
    )
    stop: str = Field(..., description="Stop datetime in 'YYYY-MM-DD HH:MM:SS' format.")
    partner_ids: Optional[list[int]] = Field(
        default_factory=list,
        description="List of partner IDs (res.partner) to invite as attendees.",
    )
    allday: bool = Field(False, description="Set to true if it is an all-day event.")
    description: Optional[str] = Field(
        None, description="Detailed description of the event."
    )


class SOLineSchema(BaseOdooRequest):
    product_id: int = Field(..., description="ID of the product (product.product)")
    product_uom_qty: float = Field(1.0, description="Quantity")
    price_unit: Optional[float] = Field(
        None,
        description="Unit price. If not provided, Odoo uses the product's default price.",
    )


class CreateSaleOrderSchema(BaseOdooRequest):
    partner_id: int = Field(..., description="ID of the customer (res.partner)")
    lines: List[SOLineSchema] = Field(..., description="List of order lines")


class ConfirmSaleOrderSchema(BaseOdooRequest):
    order_id: int = Field(..., description="ID of the sale.order to confirm")


class CreateLeadSchema(BaseOdooRequest):
    name: str = Field(..., description="Opportunity or lead name/title")
    partner_id: Optional[int] = Field(None, description="Linked customer ID")
    expected_revenue: Optional[float] = Field(None, description="Expected revenue")
    probability: Optional[float] = Field(
        None, description="Success probability (0-100)"
    )
    description: Optional[str] = Field(
        None, description="Internal notes or description"
    )




class FindProductSchema(BaseOdooRequest):
    name: Optional[str] = Field(None, description="Product name search")
    default_code: Optional[str] = Field(None, description="Internal reference/SKU")
    barcode: Optional[str] = Field(None, description="Product barcode")
    category_id: Optional[int] = Field(None, description="product.category ID")
    vendor_id: Optional[int] = Field(None, description="Vendor partner ID")
    limit: int = Field(10, description="Max results")


class GetProductSummarySchema(BaseOdooRequest):
    product_id: int = Field(..., description="product.product ID")


class GetProductSupplierInfoSchema(BaseOdooRequest):
    product_id: int = Field(..., description="product.product ID")
    partner_id: Optional[int] = Field(None, description="Optional vendor partner ID")
    limit: int = Field(20, description="Max supplierinfo records")


class GetProductStockContextSchema(BaseOdooRequest):
    product_id: int = Field(..., description="product.product ID")
    location_id: Optional[int] = Field(None, description="Optional stock.location ID")


class GetStockAvailabilitySchema(BaseOdooRequest):
    product_ids: list[int] = Field(..., description="Product IDs to summarize")
    location_id: Optional[int] = Field(None, description="Optional stock.location ID")


class GetLogisticsCapabilitiesSchema(BaseOdooRequest):
    pass


class FindReorderingRulesSchema(BaseOdooRequest):
    product_id: Optional[int] = Field(None, description="Optional product.product ID")
    location_id: Optional[int] = Field(None, description="Optional stock.location ID")
    company_id: Optional[int] = Field(None, description="Optional company ID")
    low_stock_only: bool = Field(False, description="Only rules currently requiring replenishment")
    limit: int = Field(50, description="Max reordering rules")


class GetReplenishmentSuggestionsSchema(BaseOdooRequest):
    product_id: Optional[int] = Field(None, description="Optional product.product ID")
    location_id: Optional[int] = Field(None, description="Optional stock.location ID")
    company_id: Optional[int] = Field(None, description="Optional company ID")
    limit: int = Field(50, description="Max suggestion rows")


class FindInventoryDiscrepanciesSchema(BaseOdooRequest):
    product_id: Optional[int] = Field(None, description="Optional product.product ID")
    location_id: Optional[int] = Field(None, description="Optional stock.location ID")
    company_id: Optional[int] = Field(None, description="Optional company ID")
    limit: int = Field(100, description="Max discrepancy rows")


class PrepareInventoryAdjustmentSchema(BaseOdooRequest):
    quant_id: int = Field(..., description="stock.quant ID")
    counted_quantity: float = Field(..., description="Physical counted quantity")


class ApplyInventoryAdjustmentSchema(PrepareInventoryAdjustmentSchema):
    confirm: bool = Field(False, description="Must be true to apply inventory adjustment")
    dry_run: bool = Field(True, description="Return adjustment plan without executing")




class FindPurchaseReceiptsSchema(BaseOdooRequest):
    purchase_order_id: Optional[int] = Field(None, description="Optional purchase.order ID")
    partner_id: Optional[int] = Field(None, description="Optional vendor partner ID")
    state: Optional[str] = Field(None, description="Optional stock.picking state")
    date_from: Optional[str] = Field(None, description="Scheduled date from YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Scheduled date to YYYY-MM-DD")
    limit: int = Field(20, description="Max receipts")


class GetReceiptSummarySchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Incoming stock.picking ID")


class MatchReceiptToPurchaseOrderSchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Incoming stock.picking ID")
    purchase_order_id: Optional[int] = Field(None, description="Optional purchase.order ID override")


class PrepareReceiptValidationSchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Incoming stock.picking ID")


class ValidateReceiptSchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Incoming stock.picking ID")
    confirm: bool = Field(False, description="Must be true to validate receipt")
    dry_run: bool = Field(True, description="Return validation plan without executing")


class FindSaleDeliveriesSchema(BaseOdooRequest):
    sale_order_id: Optional[int] = Field(None, description="Optional sale.order ID")
    partner_id: Optional[int] = Field(None, description="Optional customer partner ID")
    state: Optional[str] = Field(None, description="Optional stock.picking state")
    date_from: Optional[str] = Field(None, description="Scheduled date from YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Scheduled date to YYYY-MM-DD")
    limit: int = Field(20, description="Max deliveries")


class FindInternalTransfersSchema(BaseOdooRequest):
    state: Optional[str] = Field(None, description="Optional stock.picking state")
    date_from: Optional[str] = Field(None, description="Scheduled date from YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Scheduled date to YYYY-MM-DD")
    limit: int = Field(20, description="Max internal transfers")


class FindLotSerialSchema(BaseOdooRequest):
    name: Optional[str] = Field(None, description="Lot/serial name search")
    product_id: Optional[int] = Field(None, description="Optional product.product ID")
    company_id: Optional[int] = Field(None, description="Optional company ID")
    limit: int = Field(20, description="Max lots/serials")


class GetLotTraceabilitySchema(BaseOdooRequest):
    lot_id: int = Field(..., description="stock.lot or stock.production.lot ID")


class CheckLotRequirementsSchema(BaseOdooRequest):
    picking_id: int = Field(..., description="stock.picking ID")


class GetDeliverySummarySchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Outgoing stock.picking ID")


class MatchDeliveryToSaleOrderSchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Outgoing stock.picking ID")
    sale_order_id: Optional[int] = Field(None, description="Optional sale.order ID override")


class GetTransferSummarySchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Internal stock.picking ID")


class PrepareDeliveryValidationSchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Outgoing stock.picking ID")


class PrepareTransferValidationSchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Internal stock.picking ID")


class ValidateDeliverySchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Outgoing stock.picking ID")
    confirm: bool = Field(False, description="Must be true to validate delivery")
    dry_run: bool = Field(True, description="Return validation plan without executing")


class ValidateTransferSchema(BaseOdooRequest):
    picking_id: int = Field(..., description="Internal stock.picking ID")
    confirm: bool = Field(False, description="Must be true to validate transfer")
    dry_run: bool = Field(True, description="Return validation plan without executing")


class InternalTransferLineSchema(BaseModel):
    product_id: int = Field(..., description="product.product ID")
    quantity: float = Field(..., gt=0, description="Quantity to transfer")


class PrepareInternalTransferSchema(BaseOdooRequest):
    location_id: int = Field(..., description="Source stock.location ID")
    location_dest_id: int = Field(..., description="Destination stock.location ID")
    lines: list[InternalTransferLineSchema] = Field(..., description="Transfer lines")
    picking_type_id: Optional[int] = Field(None, description="Optional internal stock.picking.type ID")
    origin: Optional[str] = Field(None, description="Optional transfer origin/reference")


class CreateInternalTransferSchema(PrepareInternalTransferSchema):
    confirm: bool = Field(False, description="Must be true to create transfer")
    dry_run: bool = Field(True, description="Return creation plan without executing")


class FindStockLocationsSchema(BaseOdooRequest):
    name: Optional[str] = Field(None, description="Location name search")
    usage: Optional[str] = Field(None, description="Location usage: internal, supplier, customer, transit, inventory, production")
    limit: int = Field(20, description="Max results")


class GetLocationStockSummarySchema(BaseOdooRequest):
    location_id: int = Field(..., description="stock.location ID")
    product_id: Optional[int] = Field(None, description="Optional product.product ID")
    limit: int = Field(100, description="Max stock quants")


class GetStockMovesSchema(BaseOdooRequest):
    product_id: Optional[int] = Field(None, description="Optional product.product ID")
    picking_id: Optional[int] = Field(None, description="Optional stock.picking ID")
    state: Optional[str] = Field(None, description="Optional stock.move state")
    date_from: Optional[str] = Field(None, description="Start date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="End date YYYY-MM-DD")
    limit: int = Field(50, description="Max moves")


class ExplainStockForecastSchema(BaseOdooRequest):
    product_id: int = Field(..., description="product.product ID")
    limit: int = Field(20, description="Max incoming/outgoing moves")


class GetProductStockSchema(BaseOdooRequest):
    product_id: int = Field(..., description="The ID of the product.product record")
    location_id: Optional[int] = Field(
        None, description="Optional specific stock location ID"
    )


class LogTimesheetSchema(BaseOdooRequest):
    project_id: int = Field(..., description="The ID of the project")
    task_id: Optional[int] = Field(
        None, description="The ID of the task (optional but recommended)"
    )
    name: str = Field(..., description="Description of the work done")
    unit_amount: float = Field(..., description="Time spent in hours")
    employee_id: Optional[int] = Field(
        None, description="Employee ID (defaults to current user's employee)"
    )
    date: str = Field(..., description="Date of the timesheet log (YYYY-MM-DD)")


class FindAttendanceSchema(BaseOdooRequest):
    user_id: Optional[int] = Field(
        None, description="Odoo user ID to resolve attendance employee"
    )
    employee_id: Optional[int] = Field(
        None, description="Employee ID for direct attendance query"
    )
    date_from: Optional[str] = Field(
        None, description="Start date (YYYY-MM-DD). Defaults to today"
    )
    date_to: Optional[str] = Field(
        None, description="End date (YYYY-MM-DD). Defaults to date_from"
    )
    limit: int = Field(50, description="Max results")


class LogTaskTimesheetSchema(BaseOdooRequest):
    task_id: int = Field(..., description="project.task ID")
    name: str = Field(..., description="Description of the work done")
    unit_amount: float = Field(..., description="Time spent in hours")
    employee_id: Optional[int] = Field(
        None, description="Employee ID (defaults to current user's employee)"
    )
    date: Optional[str] = Field(
        None, description="Date of the timesheet log (YYYY-MM-DD), defaults to today"
    )


class CheckInSchema(BaseOdooRequest):
    employee_id: Optional[int] = Field(
        None, description="Employee ID override (defaults to sender user employee)"
    )
    check_in_at: Optional[str] = Field(
        None, description="Optional datetime override YYYY-MM-DD HH:MM:SS"
    )


class CheckOutSchema(BaseOdooRequest):
    employee_id: Optional[int] = Field(
        None, description="Employee ID override (defaults to sender user employee)"
    )
    check_out_at: Optional[str] = Field(
        None, description="Optional datetime override YYYY-MM-DD HH:MM:SS"
    )


class GetMyTodaySummarySchema(BaseOdooRequest):
    employee_id: Optional[int] = Field(
        None, description="Employee ID override (defaults to sender user employee)"
    )


class FindMyTasksSchema(BaseOdooRequest):
    project_id: Optional[int] = Field(None, description="Filter by project ID")
    state: Optional[str] = Field(None, description="Task state filter: open | closed")
    date_deadline_from: Optional[str] = Field(
        None, description="Deadline from YYYY-MM-DD"
    )
    date_deadline_to: Optional[str] = Field(None, description="Deadline to YYYY-MM-DD")
    limit: int = Field(20, description="Max results")


class UpdateTaskStatusSchema(BaseOdooRequest):
    task_id: int = Field(..., description="Task ID to update")
    stage_id: Optional[int] = Field(None, description="Target stage ID")
    stage_name: Optional[str] = Field(
        None, description="Target stage name (resolved automatically)"
    )
    comment: Optional[str] = Field(
        None, description="Optional comment to post in task chatter"
    )


class CreateExpenseReportSchema(BaseOdooRequest):
    name: Optional[str] = Field(None, description="Expense report name")
    expense_ids: Optional[list[int]] = Field(
        None, description="Optional explicit list of hr.expense IDs"
    )
    employee_id: Optional[int] = Field(
        None, description="Employee ID override (defaults to sender user employee)"
    )
    date_from: Optional[str] = Field(None, description="Expense date from YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Expense date to YYYY-MM-DD")


class SubmitExpenseReportSchema(BaseOdooRequest):
    sheet_id: int = Field(..., description="hr.expense.sheet ID")


class ApproveExpenseSchema(BaseOdooRequest):
    sheet_id: int = Field(..., description="hr.expense.sheet ID")
    approve: bool = Field(True, description="True=approve, False=reject")
    reason: Optional[str] = Field(None, description="Reason for rejection/decision")


class FindMissingTimesheetsSchema(BaseOdooRequest):
    employee_id: Optional[int] = Field(
        None, description="Employee ID override (defaults to sender user employee)"
    )
    date_from: Optional[str] = Field(None, description="Analysis start date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Analysis end date YYYY-MM-DD")
    tolerance_hours: float = Field(0.25, description="Missing-hours threshold per day")


class SuggestTimesheetFromAttendanceSchema(BaseOdooRequest):
    employee_id: Optional[int] = Field(
        None, description="Employee ID override (defaults to sender user employee)"
    )
    date_from: Optional[str] = Field(None, description="Analysis start date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Analysis end date YYYY-MM-DD")
    tolerance_hours: float = Field(0.25, description="Missing-hours threshold per day")


class NotifyPendingActionsSchema(BaseOdooRequest):
    employee_id: Optional[int] = Field(
        None, description="Employee ID override (defaults to sender user employee)"
    )
    days_back: int = Field(7, description="Number of days to analyze for reminders")


class RegisterPaymentSchema(BaseOdooRequest):
    invoice_id: int = Field(
        ..., description="The ID of the account.move (invoice) to pay"
    )
    amount: float = Field(..., description="Amount to pay")
    payment_date: Optional[str] = Field(
        None, description="Date of payment (YYYY-MM-DD), default today"
    )
    journal_id: Optional[int] = Field(
        None,
        description="Payment Journal ID (Bank/Cash). If not provided, Odoo will try to use the default one.",
    )


class FindUnreconciledBankLinesSchema(BaseOdooRequest):
    journal_id: Optional[int] = Field(None, description="Filter by bank journal ID")
    date_from: Optional[str] = Field(None, description="Start date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="End date YYYY-MM-DD")
    amount_min: Optional[float] = Field(None, description="Minimum absolute amount")
    amount_max: Optional[float] = Field(None, description="Maximum absolute amount")
    limit: int = Field(50, description="Max statement lines")


class SuggestBankReconciliationSchema(BaseOdooRequest):
    statement_line_id: int = Field(..., description="account.bank.statement.line ID")
    tolerance_amount: float = Field(0.01, description="Amount tolerance for matching")
    days_window: int = Field(30, description="Allowed day distance for date matching")
    limit: int = Field(20, description="Max suggestion rows")


class ReconcileBankLineSchema(BaseOdooRequest):
    statement_line_id: int = Field(..., description="account.bank.statement.line ID")
    move_line_ids: list[int] = Field(
        ..., description="account.move.line IDs to reconcile"
    )
    confirm: bool = Field(
        False,
        description="Must be true to execute reconciliation",
    )


class RegisterInvoicePaymentSchema(BaseOdooRequest):
    invoice_id: int = Field(..., description="account.move invoice ID")
    amount: Optional[float] = Field(None, description="Amount to register")
    payment_date: Optional[str] = Field(None, description="Date YYYY-MM-DD")
    journal_id: Optional[int] = Field(None, description="account.journal ID")
    memo: Optional[str] = Field(None, description="Payment communication/reference")


class GetARAPAgingSchema(BaseOdooRequest):
    report_type: str = Field(
        "both",
        description="receivable | payable | both",
    )
    as_of: Optional[str] = Field(None, description="Reference date YYYY-MM-DD")
    company_id: Optional[int] = Field(None, description="Restrict to company ID")
    limit: int = Field(500, description="Max invoices to analyze")


class RunPeriodCloseChecksSchema(BaseOdooRequest):
    period_start: str = Field(..., description="Start date YYYY-MM-DD")
    period_end: str = Field(..., description="End date YYYY-MM-DD")
    company_id: Optional[int] = Field(None, description="Restrict to company ID")


class JournalEntryLineSchema(BaseOdooRequest):
    account_id: int = Field(..., description="account.account ID")
    name: str = Field("Line", description="Line label")
    debit: float = Field(0.0, description="Debit amount")
    credit: float = Field(0.0, description="Credit amount")
    partner_id: Optional[int] = Field(None, description="Optional partner")
    analytic_account_id: Optional[int] = Field(
        None, description="Optional analytic account"
    )
    tax_ids: Optional[list[int]] = Field(None, description="Optional tax IDs")


class CreateJournalEntrySchema(BaseOdooRequest):
    journal_id: int = Field(..., description="account.journal ID")
    date: str = Field(..., description="Entry date YYYY-MM-DD")
    lines: list[JournalEntryLineSchema] = Field(..., description="Move lines")
    ref: Optional[str] = Field(None, description="Reference text")
    company_id: Optional[int] = Field(None, description="Restrict to company ID")


class PostJournalEntrySchema(BaseOdooRequest):
    move_id: int = Field(..., description="account.move ID")
    confirm: bool = Field(False, description="Must be true to post entry")


class GetTaxSummarySchema(BaseOdooRequest):
    date_from: str = Field(..., description="Start date YYYY-MM-DD")
    date_to: str = Field(..., description="End date YYYY-MM-DD")
    company_id: Optional[int] = Field(None, description="Restrict to company ID")
    tax_group_id: Optional[int] = Field(None, description="Optional tax group filter")


class ValidateVendorBillDuplicateSchema(BaseOdooRequest):
    partner_id: int = Field(..., description="Vendor partner ID")
    vendor_bill_number: Optional[str] = Field(None, description="Vendor reference")
    invoice_date: Optional[str] = Field(None, description="Invoice date YYYY-MM-DD")
    amount_total: Optional[float] = Field(None, description="Invoice total amount")
    currency_id: Optional[int] = Field(None, description="Currency ID")
    tolerance: float = Field(0.01, description="Amount tolerance")


class SuggestExpenseAccountAndTaxesSchema(BaseOdooRequest):
    description: str = Field(..., description="Line description")
    amount: float = Field(..., description="Line amount")
    partner_id: Optional[int] = Field(None, description="Vendor partner ID")
    product_id: Optional[int] = Field(None, description="product.product ID")
    company_id: Optional[int] = Field(None, description="Company ID")


class CreateVendorBillFromOCRValidatedSchema(BaseOdooRequest):
    ocr_payload: Dict[str, Any] = Field(..., description="Normalized OCR payload")
    attachment_id: Optional[int] = Field(
        None,
        description="Optional ir.attachment ID to link",
    )
    confirm: bool = Field(False, description="Must be true to create vendor bill")
    dry_run: bool = Field(True, description="Return preview without creation")
    company_id: Optional[int] = Field(None, description="Company override")
    allowed_company_ids: Optional[list[int]] = Field(
        None,
        description="Optional allowed_company_ids context",
    )
    total_tolerance: float = Field(0.01, description="Allowed OCR/line total delta")
    vendor_create_policy: str = Field(
        "propose_create",
        description="Vendor creation policy: search_only, propose_create, create_with_confirm",
    )
    confirm_partner_create: bool = Field(
        False,
        description="Must be true, together with confirm=true and dry_run=false, to create a missing vendor partner",
    )


class GetCapabilitiesSchema(BaseOdooRequest):
    pass


class CreateHelpdeskTicketSchema(BaseOdooRequest):
    name: str = Field(..., description="Ticket title")
    description: Optional[str] = Field(None, description="Ticket description")
    partner_id: Optional[int] = Field(None, description="Linked customer/contact")
    email: Optional[str] = Field(None, description="Fallback customer email")
    team_id: Optional[int] = Field(None, description="Helpdesk team ID")
    priority: Optional[str] = Field(
        None, description="Priority value supported by the target helpdesk module"
    )


class CreateHelpdeskTicketFromPartnerSchema(BaseOdooRequest):
    partner_id: int = Field(..., description="Linked customer/contact")
    name: str = Field(..., description="Ticket title")
    description: Optional[str] = Field(None, description="Ticket description")
    team_id: Optional[int] = Field(None, description="Helpdesk team ID")
    priority: Optional[str] = Field(
        None, description="Priority value supported by the target helpdesk module"
    )


class CreateActivitySummarySchema(BaseOdooRequest):
    model: str = Field(..., description="Target model name")
    res_id: int = Field(..., description="Target record ID")
    summary: str = Field(..., description="Short activity summary")
    note: Optional[str] = Field(None, description="Detailed note")
    user_id: Optional[int] = Field(None, description="Assign to specific user")


class CloseActivityWithReasonSchema(BaseOdooRequest):
    activity_id: int = Field(..., description="mail.activity ID")
    reason: Optional[str] = Field(None, description="Reason/feedback for closing")


class DraftTicketEmailSchema(BaseOdooRequest):
    ticket_id: int = Field(..., description="helpdesk.ticket ID")
    subject: str = Field(..., description="Draft subject")
    body: str = Field(..., description="Draft body")
    email_to: Optional[str] = Field(None, description="Override recipient email")


class CreateContractLineSchema(BaseOdooRequest):
    contract_id: int = Field(..., description="contract.contract ID")
    product_id: Optional[int] = Field(None, description="Optional product.product ID")
    name: Optional[str] = Field(None, description="Line description")
    quantity: Optional[float] = Field(None, description="Quantity")
    price_unit: Optional[float] = Field(None, description="Unit price")
    date_start: Optional[str] = Field(None, description="Start date YYYY-MM-DD")
    date_end: Optional[str] = Field(None, description="End date YYYY-MM-DD")


class ReplaceContractLineSchema(BaseOdooRequest):
    line_id: int = Field(..., description="Existing contract.line ID")
    product_id: Optional[int] = Field(
        None, description="Optional replacement product.product ID"
    )
    name: Optional[str] = Field(None, description="Replacement line description")
    quantity: Optional[float] = Field(None, description="Replacement quantity")
    price_unit: Optional[float] = Field(None, description="Replacement unit price")
    date_start: Optional[str] = Field(
        None, description="Replacement start date YYYY-MM-DD"
    )
    date_end: Optional[str] = Field(None, description="Replacement end date YYYY-MM-DD")
    close_reason: Optional[str] = Field(
        None, description="Reason to annotate on the old line"
    )


class CloseContractLineSchema(BaseOdooRequest):
    line_id: int = Field(..., description="contract.line ID")
    reason: Optional[str] = Field(None, description="Reason/annotation for closure")
    close_date: Optional[str] = Field(None, description="Close date YYYY-MM-DD")


class GetViewByXmlIdSchema(BaseOdooRequest):
    xmlid: str = Field(..., description="View xmlid, for example sale.view_order_form")
    include_inherited_chain: bool = Field(
        True,
        description="Include first-level inherited views linked through inherit_id",
    )


class FindViewsByModelSchema(BaseOdooRequest):
    model: str = Field(..., description="Target model name, for example sale.order")
    view_type: Optional[str] = Field(
        None,
        description="Optional view type filter (form, list, kanban, search, qweb)",
    )
    limit: int = Field(50, description="Maximum number of views returned")


class GetReportTemplateSchema(BaseOdooRequest):
    xmlid: str = Field(
        ...,
        description="Report action xmlid, for example sale.action_report_saleorder",
    )


class ScanViewMigrationIssuesSchema(BaseOdooRequest):
    xmlid: str = Field(..., description="View xmlid to scan")
    target_version: str = Field("18.0", description="Target Odoo version")
    rule_sets: Optional[list[str]] = Field(
        None,
        description="Optional rule-set names to tag scan execution",
    )


class ScanReportMigrationIssuesSchema(BaseOdooRequest):
    xmlid: str = Field(..., description="Report xmlid to scan")
    target_version: str = Field("18.0", description="Target Odoo version")
    rule_sets: Optional[list[str]] = Field(
        None,
        description="Optional rule-set names to tag scan execution",
    )


class ProposeViewPatchSchema(BaseOdooRequest):
    xmlid: str = Field(..., description="View xmlid")
    intent: str = Field("migrate_to_18", description="Proposal intent")
    constraints: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional proposal constraints (for example deny_base_overwrite)",
    )


class ProposeReportPatchSchema(BaseOdooRequest):
    xmlid: str = Field(..., description="Report xmlid")
    intent: str = Field("migrate_to_18", description="Proposal intent")
    constraints: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional proposal constraints (for example deny_base_overwrite)",
    )


class ValidateViewPatchSchema(BaseOdooRequest):
    base_view_xmlid: str = Field(..., description="Base view xmlid used for validation")
    patch: Dict[str, Any] = Field(..., description="Patch payload")
    strict: bool = Field(True, description="Fail when xpath matches multiple nodes")
    target_version: str = Field("18.0", description="Compatibility validation target")


class ValidateReportPatchSchema(BaseOdooRequest):
    report_xmlid: str = Field(..., description="Report action xmlid")
    patch: Dict[str, Any] = Field(..., description="Patch payload")
    strict: bool = Field(True, description="Fail when xpath matches multiple nodes")
    target_version: str = Field("18.0", description="Compatibility validation target")


class PreviewViewPatchSchema(BaseOdooRequest):
    base_view_xmlid: str = Field(..., description="Base view xmlid used for preview")
    patch: Dict[str, Any] = Field(..., description="Patch payload")
    diff_format: str = Field("unified", description="Diff output format")


class PreviewReportPatchSchema(BaseOdooRequest):
    report_xmlid: str = Field(..., description="Report action xmlid used for preview")
    patch: Dict[str, Any] = Field(..., description="Patch payload")
    diff_format: str = Field("unified", description="Diff output format")


class TestViewCompilationSchema(BaseOdooRequest):
    view_xmlid: str = Field(..., description="View xmlid for compilation check")
    context: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional Odoo context overrides",
    )


class ApplyViewPatchSafeSchema(BaseOdooRequest):
    base_view_xmlid: str = Field(..., description="Base view xmlid to extend safely")
    patch: Dict[str, Any] = Field(..., description="xml_inheritance patch payload")
    strict: bool = Field(True, description="Fail when xpath matches multiple nodes")
    confirm: bool = Field(False, description="Must be true to execute persistent apply")
    dry_run: bool = Field(
        False, description="Preview write plan without creating records"
    )
    inherited_view_name: Optional[str] = Field(
        None,
        description="Optional name for the generated inherited view",
    )
    priority: int = Field(
        90, description="Priority assigned to generated inherited view"
    )


class ApplyReportPatchSafeSchema(BaseOdooRequest):
    report_xmlid: str = Field(..., description="Report action xmlid to extend safely")
    patch: Dict[str, Any] = Field(..., description="xml_inheritance patch payload")
    strict: bool = Field(True, description="Fail when xpath matches multiple nodes")
    confirm: bool = Field(False, description="Must be true to execute persistent apply")
    dry_run: bool = Field(
        False, description="Preview write plan without creating records"
    )
    inherited_view_name: Optional[str] = Field(
        None,
        description="Optional name for the generated inherited report template",
    )
    priority: int = Field(
        90, description="Priority assigned to generated inherited view"
    )


class RollbackPatchSafeSchema(BaseOdooRequest):
    snapshot: Dict[str, Any] = Field(
        ...,
        description="Snapshot payload returned by apply_safe tools",
    )
    confirm: bool = Field(False, description="Must be true to execute rollback")
    dry_run: bool = Field(False, description="Preview rollback plan without writes")


class AssistViewMigrationSchema(BaseOdooRequest):
    xmlid: str = Field(..., description="View xmlid to analyze end-to-end")
    target_version: str = Field("18.0", description="Target Odoo version")
    intent: str = Field("migrate", description="Migration intent")
    constraints: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional proposal constraints",
    )
    strict: bool = Field(True, description="Strict XPath validation mode")
    include_compile_test: bool = Field(
        True,
        description="Include fields_view_get best-effort compilation check",
    )


class AssistReportMigrationSchema(BaseOdooRequest):
    xmlid: str = Field(..., description="Report xmlid to analyze end-to-end")
    target_version: str = Field("18.0", description="Target Odoo version")
    intent: str = Field("migrate", description="Migration intent")
    constraints: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional proposal constraints",
    )
    strict: bool = Field(True, description="Strict XPath validation mode")


class VisualizeViewPatchSchema(BaseOdooRequest):
    base_view_xmlid: str = Field(
        ..., description="Base view xmlid used for visual preview"
    )
    patch: Dict[str, Any] = Field(..., description="Patch payload")
    diff_format: str = Field("unified", description="Diff output format")


class VisualizeReportPatchSchema(BaseOdooRequest):
    report_xmlid: str = Field(
        ..., description="Report action xmlid used for visual preview"
    )
    patch: Dict[str, Any] = Field(..., description="Patch payload")
    diff_format: str = Field("unified", description="Diff output format")


class BatchAssistViewMigrationSchema(BaseOdooRequest):
    xmlids: List[str] = Field(..., description="View xmlids to analyze in batch")
    target_version: str = Field("18.0", description="Target Odoo version")
    intent: str = Field("migrate", description="Migration intent")
    constraints: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional proposal constraints",
    )
    strict: bool = Field(True, description="Strict XPath validation mode")
    include_compile_test: bool = Field(
        False,
        description="Include fields_view_get compilation checks for each item",
    )
    continue_on_error: bool = Field(
        True,
        description="Continue processing remaining xmlids when one item fails",
    )


class BatchAssistReportMigrationSchema(BaseOdooRequest):
    xmlids: List[str] = Field(..., description="Report xmlids to analyze in batch")
    target_version: str = Field("18.0", description="Target Odoo version")
    intent: str = Field("migrate", description="Migration intent")
    constraints: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional proposal constraints",
    )
    strict: bool = Field(True, description="Strict XPath validation mode")
    continue_on_error: bool = Field(
        True,
        description="Continue processing remaining xmlids when one item fails",
    )
