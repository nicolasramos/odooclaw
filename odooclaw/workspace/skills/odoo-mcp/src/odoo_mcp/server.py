import os
import sys
from functools import lru_cache
from typing import Any

from mcp.server.fastmcp import FastMCP
from odoo_mcp.config import DEFAULT_SEARCH_LIMIT
from odoo_mcp.core.client import OdooClient
from odoo_mcp.core.session import OdooSession
from odoo_mcp.observability.logging import get_logger
from odoo_mcp.observability.metrics import measure_time
from odoo_mcp.schemas.actions import OdooInvokeActionSchema
from odoo_mcp.schemas.business import (
    ApplyInventoryAdjustmentSchema,
    ApplyReportPatchSafeSchema,
    ApplyViewPatchSafeSchema,
    ApproveExpenseSchema,
    AssistReportMigrationSchema,
    AssistViewMigrationSchema,
    BatchAssistReportMigrationSchema,
    BatchAssistViewMigrationSchema,
    CheckInSchema,
    CheckLotRequirementsSchema,
    CheckOutSchema,
    CloseActivityWithReasonSchema,
    CloseContractLineSchema,
    ConfirmSaleOrderSchema,
    CreateActivitySchema,
    CreateActivitySummarySchema,
    CreateCalendarEventSchema,
    CreateContractLineSchema,
    CreateExpenseReportSchema,
    CreateHelpdeskTicketFromPartnerSchema,
    CreateHelpdeskTicketSchema,
    CreateJournalEntrySchema,
    CreateLeadSchema,
    CreatePurchaseOrderSchema,
    CreateSaleOrderSchema,
    CreateTaskSchema,
    CreateVendorBillFromOCRValidatedSchema,
    CreateVendorInvoiceSchema,
    DraftTicketEmailSchema,
    FindAttendanceSchema,
    FindMissingTimesheetsSchema,
    FindMyTasksSchema,
    FindPartnerSchema,
    FindPendingInvoicesSchema,
    FindProductSchema,
    FindPurchaseOrderSchema,
    FindPurchaseReceiptsSchema,
    FindReorderingRulesSchema,
    FindSaleDeliveriesSchema,
    FindInternalTransfersSchema,
    FindInventoryDiscrepanciesSchema,
    FindLotSerialSchema,
    FindSaleOrderSchema,
    FindStockLocationsSchema,
    FindTaskSchema,
    FindUnreconciledBankLinesSchema,
    FindViewsByModelSchema,
    GetARAPAgingSchema,
    GetCapabilitiesSchema,
    GetInvoiceSummarySchema,
    GetModelSchemaSchema,
    GetMyTodaySummarySchema,
    GetLocationStockSummarySchema,
    GetLogisticsCapabilitiesSchema,
    GetLotTraceabilitySchema,
    GetPartnerSummarySchema,
    GetProductStockContextSchema,
    GetProductStockSchema,
    GetProductSummarySchema,
    GetProductSupplierInfoSchema,
    GetPurchaseInvoiceStatusSchema,
    GetReceiptSummarySchema,
    GetDeliverySummarySchema,
    GetTransferSummarySchema,
    GetPurchaseOrderSummarySchema,
    GetPurchaseReceiptStatusSchema,
    GetReplenishmentSuggestionsSchema,
    GetRecordSummarySchema,
    GetReportTemplateSchema,
    GetSaleOrderSummarySchema,
    GetStockAvailabilitySchema,
    GetStockMovesSchema,
    GetTaxSummarySchema,
    GetViewByXmlIdSchema,
    InvoiceLineSchema,
    JournalEntryLineSchema,
    ListPendingActivitiesSchema,
    LogTaskTimesheetSchema,
    LogTimesheetSchema,
    MarkActivityDoneSchema,
    MatchDeliveryToSaleOrderSchema,
    MatchReceiptToPurchaseOrderSchema,
    MatchVendorBillToPurchaseOrderSchema,
    NotifyPendingActionsSchema,
    POLineSchema,
    PostChatterMessageSchema,
    PostJournalEntrySchema,
    PrepareReceiptValidationSchema,
    PrepareDeliveryValidationSchema,
    PrepareTransferValidationSchema,
    PrepareInternalTransferSchema,
    PrepareInventoryAdjustmentSchema,
    CreateInternalTransferSchema,
    PreviewReportPatchSchema,
    PreviewViewPatchSchema,
    ProposeReportPatchSchema,
    ProposeViewPatchSchema,
    ReconcileBankLineSchema,
    RegisterInvoicePaymentSchema,
    RegisterPaymentSchema,
    ReplaceContractLineSchema,
    RollbackPatchSafeSchema,
    RunPeriodCloseChecksSchema,
    SOLineSchema,
    ScanReportMigrationIssuesSchema,
    ScanViewMigrationIssuesSchema,
    SubmitExpenseReportSchema,
    SuggestBankReconciliationSchema,
    ExplainStockForecastSchema,
    SuggestExpenseAccountAndTaxesSchema,
    SuggestTimesheetFromAttendanceSchema,
    SuggestVendorProductsSchema,
    TestViewCompilationSchema,
    UpdateTaskSchema,
    UpdateTaskStatusSchema,
    ValidateReceiptSchema,
    ValidateDeliverySchema,
    ValidateTransferSchema,
    ValidateReportPatchSchema,
    ValidateVendorBillDuplicateSchema,
    ValidateViewPatchSchema,
    VisualizeReportPatchSchema,
    VisualizeViewPatchSchema,
)
from odoo_mcp.schemas.records import (
    OdooCreateSchema,
    OdooReadSchema,
    OdooSearchSchema,
    OdooWriteSchema,
)
from odoo_mcp.services.accounting_service import (
    create_journal_entry,
    create_vendor_bill_from_ocr_validated,
    find_unreconciled_bank_lines,
    get_ar_ap_aging,
    get_tax_summary,
    post_journal_entry,
    reconcile_bank_line,
    register_invoice_payment,
    run_period_close_checks,
    suggest_bank_reconciliation,
    suggest_expense_account_and_taxes,
    validate_vendor_bill_duplicate,
)
from odoo_mcp.services.calendar_service import create_calendar_event
from odoo_mcp.services.crm_service import create_lead
from odoo_mcp.services.hr_service import (
    find_attendance,
    log_task_timesheet,
    log_timesheet,
)
from odoo_mcp.services.inventory_service import (
    apply_inventory_adjustment,
    check_lot_requirements,
    explain_stock_forecast,
    find_product,
    find_purchase_receipts,
    find_reordering_rules,
    find_sale_deliveries,
    find_internal_transfers,
    find_inventory_discrepancies,
    find_lot_serial,
    find_stock_locations,
    get_location_stock_summary,
    get_logistics_capabilities,
    get_lot_traceability,
    get_product_stock,
    get_product_stock_context,
    get_product_summary,
    get_product_supplier_info,
    get_replenishment_suggestions,
    get_receipt_summary,
    get_delivery_summary,
    get_transfer_summary,
    get_stock_availability,
    get_stock_moves,
    match_delivery_to_sale_order,
    match_receipt_to_purchase_order,
    prepare_receipt_validation,
    prepare_delivery_validation,
    prepare_transfer_validation,
    prepare_internal_transfer,
    prepare_inventory_adjustment,
    create_internal_transfer,
    validate_delivery,
    validate_receipt,
    validate_transfer,
)
from odoo_mcp.services.invoice_service import (
    find_pending_invoices,
    get_invoice_summary,
    register_payment,
)
from odoo_mcp.services.sales_service import confirm_sale_order, create_sale_order
from odoo_mcp.services.view_migration_service import (
    apply_report_patch_safe,
    apply_view_patch_safe,
    assist_report_migration,
    assist_view_migration,
    batch_assist_report_migration,
    batch_assist_view_migration,
    find_views_by_model,
    get_report_template,
    get_view_by_xmlid,
    preview_report_patch,
    preview_view_patch,
    propose_report_patch,
    propose_view_patch,
    rollback_patch_safe,
    scan_report_migration_issues,
    scan_view_migration_issues,
    test_view_compilation,
    validate_report_patch,
    validate_view_patch,
    visualize_report_patch,
    visualize_view_patch,
)
from odoo_mcp.services.workforce_service import (
    approve_expense,
    check_in,
    check_out,
    create_expense_report,
    find_missing_timesheets,
    get_my_today_summary,
    notify_pending_actions,
    submit_expense_report,
    suggest_timesheet_from_attendance,
)
from odoo_mcp.tools import (
    accounting,
    actions,
    business_ops,
    chatter,
    generic,
    introspection,
    partners,
    projects,
    purchases,
    records,
    sales,
)

_logger = get_logger("server")
mcp = FastMCP("odoo-mcp")


@lru_cache(maxsize=1)
def get_odoo_client() -> OdooClient:
    url = os.environ.get("ODOO_URL")
    db = os.environ.get("ODOO_DB")
    user = os.environ.get("ODOO_USERNAME")
    pwd = os.environ.get("ODOO_PASSWORD")

    if not all([url, db, user, pwd]):
        _logger.error("Missing mandatory Odoo environment variables.")
        sys.exit(1)

    session = OdooSession(url, db, user, pwd)
    session.authenticate()
    return OdooClient(session)


# Resources (Capa 6)
@mcp.resource("odoo://context/odoo18-fields-reference")
def get_odoo18_fields_reference() -> str:
    """
    CRITICAL REFERENCE: Odoo 18 field name changes from older versions.
    The LLM MUST consult this before building domains for res.partner or account.move.
    """
    return """# Odoo 18 Field Reference — BREAKING CHANGES vs Odoo 13/14

## res.partner (Customers / Vendors)
| Odoo 13 (OLD - DO NOT USE) | Odoo 18 (CORRECT) | Notes |
|---|---|---|
| customer=True | customer_rank > 0 | customer_rank is integer >= 0 |
| supplier=True | supplier_rank > 0 | supplier_rank is integer >= 0 |
| is_customer=True | customer_rank > 0 | field does not exist in Odoo 18 |

### Correct domains for res.partner in Odoo 18:
- All customers: [["customer_rank", ">", 0]]
- All vendors: [["supplier_rank", ">", 0]]
- Active customers: [["customer_rank", ">", 0], ["active", "=", True]]
- Count records: use odoo_search with limit=0, result length = count

## account.move (Invoices / Vendor Bills)
| Odoo 13 (OLD - DO NOT USE) | Odoo 18 (CORRECT) | Notes |
|---|---|---|
| state=open | state=posted + payment_state=not_paid | 'open' state does NOT exist |
| state=paid | state=posted + payment_state=paid | |

### account.move state field values in Odoo 18:
- 'draft': unconfirmed/quotation
- 'posted': confirmed/validated (replaces 'open')
- 'cancel': cancelled

### account.move payment_state field (NEW in Odoo 15+):
- 'not_paid': no payment received
- 'partial': partially paid
- 'in_payment': payment registered but not reconciled
- 'paid': fully paid
- 'reversed': reversed by credit note

### Correct domains for pending invoices:
- Customer invoices pending:
  [["state","=","posted"],["payment_state","in",["not_paid","partial"]],
   ["move_type","=","out_invoice"]]
- Vendor bills pending:
  [["state","=","posted"],["payment_state","in",["not_paid","partial"]],
   ["move_type","=","in_invoice"]]
- USE TOOL: odoo_find_pending_invoices — it handles all this automatically

## sale.order
- state=draft: quotation
- state=sent: quotation sent
- state=sale: confirmed sale order
- state=done: locked/done
- state=cancel: cancelled

## project.task
- stage_id: references project.task.type
- Use odoo_find_task tool for task searches
"""


@mcp.resource("odoo://models")
def get_odoo_models() -> str:
    return "List of models available via introspect tool..."


@mcp.resource("odoo://model/{model_name}/schema")
def get_model_schema(model_name: str) -> str:
    client = get_odoo_client()
    return introspection.odoo_model_schema(client, client.odoo_session.uid, model_name)


@mcp.resource("odoo://record/{model}/{id}/summary")
def get_resource_record_summary(model: str, id: str) -> str:
    client = get_odoo_client()
    import json

    res = generic.odoo_get_record_summary(
        client, client.odoo_session.uid, model, int(id)
    )
    return json.dumps(res, indent=2)


@mcp.resource("odoo://record/{model}/{id}/chatter_summary")
def get_resource_chatter_summary(model: str, id: str) -> str:
    client = get_odoo_client()
    import json

    from odoo_mcp.services.generic_service import get_chatter_summary

    res = get_chatter_summary(client, client.odoo_session.uid, model, int(id))
    return json.dumps(res, indent=2)


# Tools (Capa 2, 3, 4)
@mcp.tool()
def odoo_search(
    model: str,
    domain: list | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> list:
    with measure_time("odoo_search"):
        client = get_odoo_client()
        return records.odoo_search(
            client,
            sender_id or client.odoo_session.uid,
            model,
            domain or [],
            limit,
        )


@mcp.tool()
def odoo_read(
    model: str,
    ids: list[int],
    fields: list[str] | None = None,
    sender_id: int | None = None,
) -> list:
    with measure_time("odoo_read"):
        client = get_odoo_client()
        return records.odoo_read(
            client,
            sender_id or client.odoo_session.uid,
            model,
            ids,
            fields,
        )


@mcp.tool()
def odoo_create(
    model: str,
    values: dict[str, Any],
    sender_id: int | None = None,
) -> int:
    with measure_time("odoo_create"):
        client = get_odoo_client()
        return records.odoo_create(
            client,
            sender_id or client.odoo_session.uid,
            model,
            values,
        )


@mcp.tool()
def odoo_write(
    model: str,
    ids: list[int],
    values: dict[str, Any],
    sender_id: int | None = None,
) -> bool:
    with measure_time("odoo_write"):
        client = get_odoo_client()
        return records.odoo_write(
            client,
            sender_id or client.odoo_session.uid,
            model,
            ids,
            values,
        )


@mcp.tool()
def odoo_invoke_action(
    model: str,
    method: str,
    ids: list[int],
    sender_id: int | None = None,
) -> Any:
    with measure_time("odoo_invoke_action"):
        client = get_odoo_client()
        return actions.odoo_invoke_action(
            client,
            sender_id or client.odoo_session.uid,
            model,
            method,
            ids,
        )


@mcp.tool()
def odoo_find_partner(
    name: str,
    vat: str | None = None,
    email: str | None = None,
    sender_id: int | None = None,
) -> int:
    with measure_time("odoo_find_partner"):
        client = get_odoo_client()
        return partners.odoo_find_partner(
            client,
            sender_id or client.odoo_session.uid,
            name,
            vat,
            email,
        )


@mcp.tool()
def odoo_get_partner_summary(
    partner_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_partner_summary"):
        client = get_odoo_client()
        return partners.odoo_get_partner_summary(
            client, sender_id or client.odoo_session.uid, partner_id
        )


@mcp.tool()
def odoo_create_activity(
    model: str,
    res_id: int,
    summary: str,
    note: str,
    user_id: int | None = None,
    sender_id: int | None = None,
    date_deadline: str | None = None,
) -> int:
    with measure_time("odoo_create_activity"):
        client = get_odoo_client()
        return chatter.odoo_create_activity(
            client,
            sender_id or client.odoo_session.uid,
            model,
            res_id,
            summary,
            note,
            user_id,
            date_deadline,
        )


@mcp.tool()
def odoo_list_pending_activities(
    model: str | None = None,
    user_id: int | None = None,
    sender_id: int | None = None,
) -> list:
    with measure_time("odoo_list_pending_activities"):
        client = get_odoo_client()
        return chatter.odoo_list_pending_activities(
            client,
            sender_id or client.odoo_session.uid,
            model,
            user_id,
        )


@mcp.tool()
def odoo_mark_activity_done(
    activity_id: int,
    feedback: str | None = None,
    sender_id: int | None = None,
) -> bool:
    with measure_time("odoo_mark_activity_done"):
        client = get_odoo_client()
        return chatter.odoo_mark_activity_done(
            client,
            sender_id or client.odoo_session.uid,
            activity_id,
            feedback,
        )


@mcp.tool()
def odoo_post_chatter_message(
    model: str,
    res_id: int,
    body: str,
    sender_id: int | None = None,
) -> int:
    with measure_time("odoo_post_chatter_message"):
        client = get_odoo_client()
        return chatter.odoo_post_chatter_message(
            client,
            sender_id or client.odoo_session.uid,
            model,
            res_id,
            body,
        )


@mcp.tool()
def odoo_find_task(
    name: str | None = None,
    project_id: int | None = None,
    stage_id: int | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> list:
    with measure_time("odoo_find_task"):
        client = get_odoo_client()
        return projects.odoo_find_task(
            client,
            sender_id or client.odoo_session.uid,
            name,
            project_id,
            stage_id,
            limit,
        )


@mcp.tool()
def odoo_create_task(
    name: str,
    project_id: int,
    description: str | None = None,
    assigned_to: int | None = None,
    deadline: str | None = None,
    sender_id: int | None = None,
) -> int:
    with measure_time("odoo_create_task"):
        client = get_odoo_client()
        return projects.odoo_create_task(
            client,
            sender_id or client.odoo_session.uid,
            name,
            project_id,
            description,
            assigned_to,
            deadline,
        )


@mcp.tool()
def odoo_update_task(
    task_id: int,
    stage_id: int | None = None,
    assigned_to: int | None = None,
    deadline: str | None = None,
    sender_id: int | None = None,
) -> bool:
    with measure_time("odoo_update_task"):
        client = get_odoo_client()
        return projects.odoo_update_task(
            client,
            sender_id or client.odoo_session.uid,
            task_id,
            stage_id,
            assigned_to,
            deadline,
        )


@mcp.tool()
def odoo_find_my_tasks(
    project_id: int | None = None,
    state: str | None = None,
    date_deadline_from: str | None = None,
    date_deadline_to: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> list:
    with measure_time("odoo_find_my_tasks"):
        client = get_odoo_client()
        return projects.odoo_find_my_tasks(
            client,
            sender_id or client.odoo_session.uid,
            project_id,
            state,
            date_deadline_from,
            date_deadline_to,
            limit,
        )


@mcp.tool()
def odoo_update_task_status(
    task_id: int,
    stage_id: int | None = None,
    stage_name: str | None = None,
    comment: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_update_task_status"):
        client = get_odoo_client()
        return projects.odoo_update_task_status(
            client,
            sender_id or client.odoo_session.uid,
            task_id,
            stage_id,
            stage_name,
            comment,
        )


@mcp.tool()
def odoo_find_sale_order(
    name: str | None = None,
    partner_id: int | None = None,
    state: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> list:
    with measure_time("odoo_find_sale_order"):
        client = get_odoo_client()
        return sales.odoo_find_sale_order(
            client,
            sender_id or client.odoo_session.uid,
            name,
            partner_id,
            state,
            limit,
        )


@mcp.tool()
def odoo_get_sale_order_summary(
    order_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_sale_order_summary"):
        client = get_odoo_client()
        return sales.odoo_get_sale_order_summary(
            client, sender_id or client.odoo_session.uid, order_id
        )


@mcp.tool()
def odoo_get_record_summary(
    model: str,
    res_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_record_summary"):
        client = get_odoo_client()
        return generic.odoo_get_record_summary(
            client,
            sender_id or client.odoo_session.uid,
            model,
            res_id,
        )


@mcp.tool()
def odoo_create_purchase_order(
    partner_id: int,
    lines: list[POLineSchema],
    sender_id: int | None = None,
) -> int:
    with measure_time("odoo_create_purchase_order"):
        client = get_odoo_client()
        return purchases.odoo_create_purchase_order(
            client,
            sender_id or client.odoo_session.uid,
            partner_id,
            [line.dict() for line in lines],
        )


@mcp.tool()
def odoo_find_purchase_order(
    name: str | None = None,
    partner_id: int | None = None,
    state: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_purchase_order"):
        client = get_odoo_client()
        return purchases.odoo_find_purchase_order(
            client, sender_id or client.odoo_session.uid, name, partner_id, state, limit
        )


@mcp.tool()
def odoo_get_purchase_order_summary(
    order_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_purchase_order_summary"):
        client = get_odoo_client()
        return purchases.odoo_get_purchase_order_summary(
            client, sender_id or client.odoo_session.uid, order_id
        )


@mcp.tool()
def odoo_get_purchase_receipt_status(
    purchase_order_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_purchase_receipt_status"):
        client = get_odoo_client()
        return purchases.odoo_get_purchase_receipt_status(
            client, sender_id or client.odoo_session.uid, purchase_order_id
        )


@mcp.tool()
def odoo_get_purchase_invoice_status(
    purchase_order_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_purchase_invoice_status"):
        client = get_odoo_client()
        return purchases.odoo_get_purchase_invoice_status(
            client, sender_id or client.odoo_session.uid, purchase_order_id
        )


@mcp.tool()
def odoo_suggest_vendor_products(
    partner_id: int,
    query: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_suggest_vendor_products"):
        client = get_odoo_client()
        return purchases.odoo_suggest_vendor_products(
            client, sender_id or client.odoo_session.uid, partner_id, query, limit
        )


@mcp.tool()
def odoo_match_vendor_bill_to_purchase_order(
    partner_id: int,
    vendor_bill_number: str | None = None,
    purchase_order_id: int | None = None,
    ocr_payload: dict[str, Any] | None = None,
    tolerance: float = 0.01,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_match_vendor_bill_to_purchase_order"):
        client = get_odoo_client()
        return purchases.odoo_match_vendor_bill_to_purchase_order(
            client,
            sender_id or client.odoo_session.uid,
            partner_id,
            vendor_bill_number,
            purchase_order_id,
            ocr_payload,
            tolerance,
        )


@mcp.tool()
def odoo_create_vendor_invoice(
    partner_id: int,
    lines: list[InvoiceLineSchema],
    ref: str | None = None,
    confirm: bool = False,
    dry_run: bool = True,
    total_tolerance: float = 0.01,
    vendor_create_policy: str = "propose_create",
    confirm_partner_create: bool = False,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_create_vendor_invoice"):
        client = get_odoo_client()
        return accounting.odoo_create_vendor_invoice(
            client,
            sender_id or client.odoo_session.uid,
            partner_id,
            [line.dict() for line in lines],
            ref or "",
            confirm,
            dry_run,
            total_tolerance,
            vendor_create_policy,
            confirm_partner_create,
        )


if __name__ == "__main__":
    mcp.run()


@mcp.tool()
def odoo_find_pending_invoices(
    partner_id: int | None = None,
    move_type: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> list:
    """
    Find invoices/bills pending payment for a partner.
    Uses correct Odoo 18 domains:
    state='posted' AND payment_state in ('not_paid','partial').
    DO NOT use state='open' - that is Odoo 13 and does NOT exist
    in Odoo 18.
    Omit partner_id to get ALL pending invoices.
    """
    with measure_time("odoo_find_pending_invoices"):
        client = get_odoo_client()
        return find_pending_invoices(
            client,
            sender_id or client.odoo_session.uid,
            partner_id,
            move_type,
            limit,
        )


@mcp.tool()
def odoo_get_invoice_summary(
    move_id: int,
    sender_id: int | None = None,
) -> dict:
    """Get complete details of a specific invoice (account.move), including lines."""
    with measure_time("odoo_get_invoice_summary"):
        client = get_odoo_client()
        return get_invoice_summary(
            client, sender_id or client.odoo_session.uid, move_id
        )


@mcp.tool()
def odoo_get_model_schema(
    model: str,
    sender_id: int | None = None,
) -> str:
    """Retrieve the fields and schema for a given Odoo model
    (e.g. 'res.partner'). Very useful if a field search fails.
    """
    with measure_time("odoo_get_model_schema"):
        client = get_odoo_client()
        return introspection.odoo_model_schema(
            client, sender_id or client.odoo_session.uid, model
        )


@mcp.tool()
def odoo_get_capabilities(
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_capabilities"):
        client = get_odoo_client()
        return business_ops.odoo_get_capabilities(
            client, sender_id or client.odoo_session.uid
        )


@mcp.tool()
def odoo_create_helpdesk_ticket(
    name: str,
    description: str | None = None,
    partner_id: int | None = None,
    email: str | None = None,
    team_id: int | None = None,
    priority: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_create_helpdesk_ticket"):
        client = get_odoo_client()
        return business_ops.odoo_create_helpdesk_ticket(
            client,
            sender_id or client.odoo_session.uid,
            name,
            description,
            partner_id,
            email,
            team_id,
            priority,
        )


@mcp.tool()
def odoo_create_helpdesk_ticket_from_partner(
    partner_id: int,
    name: str,
    description: str | None = None,
    team_id: int | None = None,
    priority: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_create_helpdesk_ticket_from_partner"):
        client = get_odoo_client()
        return business_ops.odoo_create_helpdesk_ticket_from_partner(
            client,
            sender_id or client.odoo_session.uid,
            partner_id,
            name,
            description,
            team_id,
            priority,
        )


@mcp.tool()
def odoo_create_activity_summary(
    model: str,
    res_id: int,
    summary: str,
    note: str | None = None,
    user_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_create_activity_summary"):
        client = get_odoo_client()
        return business_ops.odoo_create_activity_summary(
            client,
            sender_id or client.odoo_session.uid,
            model,
            res_id,
            summary,
            note,
            user_id,
        )


@mcp.tool()
def odoo_close_activity_with_reason(
    activity_id: int,
    reason: str,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_close_activity_with_reason"):
        client = get_odoo_client()
        return business_ops.odoo_close_activity_with_reason(
            client,
            sender_id or client.odoo_session.uid,
            activity_id,
            reason,
        )


@mcp.tool()
def odoo_draft_ticket_email(
    ticket_id: int,
    subject: str,
    body: str,
    email_to: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_draft_ticket_email"):
        client = get_odoo_client()
        return business_ops.odoo_draft_ticket_email(
            client,
            sender_id or client.odoo_session.uid,
            ticket_id,
            subject,
            body,
            email_to,
        )


@mcp.tool()
def odoo_create_contract_line(
    contract_id: int,
    product_id: int,
    name: str | None = None,
    quantity: float = 1.0,
    price_unit: float = 0.0,
    date_start: str | None = None,
    date_end: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_create_contract_line"):
        client = get_odoo_client()
        return business_ops.odoo_create_contract_line(
            client,
            sender_id or client.odoo_session.uid,
            contract_id,
            product_id,
            name,
            quantity,
            price_unit,
            date_start,
            date_end,
        )


@mcp.tool()
def odoo_replace_contract_line(
    line_id: int,
    product_id: int,
    name: str | None = None,
    quantity: float = 1.0,
    price_unit: float = 0.0,
    date_start: str | None = None,
    date_end: str | None = None,
    close_reason: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_replace_contract_line"):
        client = get_odoo_client()
        return business_ops.odoo_replace_contract_line(
            client,
            sender_id or client.odoo_session.uid,
            line_id,
            product_id,
            name,
            quantity,
            price_unit,
            date_start,
            date_end,
            close_reason,
        )


@mcp.tool()
def odoo_close_contract_line(
    line_id: int,
    reason: str | None = None,
    close_date: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_close_contract_line"):
        client = get_odoo_client()
        return business_ops.odoo_close_contract_line(
            client,
            sender_id or client.odoo_session.uid,
            line_id,
            reason,
            close_date,
        )


@mcp.tool()
def odoo_create_calendar_event(
    name: str,
    start: str,
    stop: str,
    partner_ids: list[int] | None = None,
    allday: bool = False,
    description: str | None = None,
    sender_id: int | None = None,
) -> int:
    """Creates a calendar event (appointment or meeting)
    handling multiple attendees automatically.
    """
    with measure_time("odoo_create_calendar_event"):
        client = get_odoo_client()
        return create_calendar_event(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            name=name,
            start=start,
            stop=stop,
            partner_ids=partner_ids,
            allday=allday,
            description=description,
        )


@mcp.tool()
def odoo_create_sale_order(
    partner_id: int,
    lines: list[SOLineSchema],
    sender_id: int | None = None,
) -> int:
    """Creates a sale order (presupuesto) for a customer with product lines."""
    with measure_time("odoo_create_sale_order"):
        client = get_odoo_client()
        return create_sale_order(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            partner_id=partner_id,
            lines=lines,
        )


@mcp.tool()
def odoo_confirm_sale_order(
    order_id: int,
    sender_id: int | None = None,
) -> bool:
    """Confirms a sale order, moving it from draft/sent to 'sale' status."""
    with measure_time("odoo_confirm_sale_order"):
        client = get_odoo_client()
        return confirm_sale_order(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            order_id=order_id,
        )


@mcp.tool()
def odoo_create_lead(
    name: str,
    partner_id: int | None = None,
    expected_revenue: float | None = None,
    probability: float | None = None,
    description: str | None = None,
    sender_id: int | None = None,
) -> int:
    """Creates a new CRM Lead / Opportunity."""
    with measure_time("odoo_create_lead"):
        client = get_odoo_client()
        return create_lead(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            name=name,
            partner_id=partner_id,
            expected_revenue=expected_revenue,
            probability=probability,
            description=description,
        )


@mcp.tool()
def odoo_find_product(
    name: str | None = None,
    default_code: str | None = None,
    barcode: str | None = None,
    category_id: int | None = None,
    vendor_id: int | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_product"):
        client = get_odoo_client()
        return find_product(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            name=name,
            default_code=default_code,
            barcode=barcode,
            category_id=category_id,
            vendor_id=vendor_id,
            limit=limit,
        )


@mcp.tool()
def odoo_get_product_summary(
    product_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_product_summary"):
        client = get_odoo_client()
        return get_product_summary(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            product_id=product_id,
        )


@mcp.tool()
def odoo_get_product_supplier_info(
    product_id: int,
    partner_id: int | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_product_supplier_info"):
        client = get_odoo_client()
        return get_product_supplier_info(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            product_id=product_id,
            partner_id=partner_id,
            limit=limit,
        )


@mcp.tool()
def odoo_get_product_stock_context(
    product_id: int,
    location_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_product_stock_context"):
        client = get_odoo_client()
        return get_product_stock_context(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            product_id=product_id,
            location_id=location_id,
        )


@mcp.tool()
def odoo_get_stock_availability(
    product_ids: list[int],
    location_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_stock_availability"):
        client = get_odoo_client()
        return get_stock_availability(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            product_ids=product_ids,
            location_id=location_id,
        )


@mcp.tool()
def odoo_get_logistics_capabilities(sender_id: int | None = None) -> dict:
    with measure_time("odoo_get_logistics_capabilities"):
        client = get_odoo_client()
        return get_logistics_capabilities(
            client,
            sender_id or client.odoo_session.uid,
        )


@mcp.tool()
def odoo_find_reordering_rules(
    product_id: int | None = None,
    location_id: int | None = None,
    company_id: int | None = None,
    low_stock_only: bool = False,
    limit: int = 50,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_reordering_rules"):
        client = get_odoo_client()
        return find_reordering_rules(
            client,
            sender_id or client.odoo_session.uid,
            product_id,
            location_id,
            company_id,
            low_stock_only,
            limit,
        )


@mcp.tool()
def odoo_get_replenishment_suggestions(
    product_id: int | None = None,
    location_id: int | None = None,
    company_id: int | None = None,
    limit: int = 50,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_replenishment_suggestions"):
        client = get_odoo_client()
        return get_replenishment_suggestions(
            client,
            sender_id or client.odoo_session.uid,
            product_id,
            location_id,
            company_id,
            limit,
        )


@mcp.tool()
def odoo_find_inventory_discrepancies(
    product_id: int | None = None,
    location_id: int | None = None,
    company_id: int | None = None,
    limit: int = 100,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_inventory_discrepancies"):
        client = get_odoo_client()
        return find_inventory_discrepancies(
            client,
            sender_id or client.odoo_session.uid,
            product_id,
            location_id,
            company_id,
            limit,
        )


@mcp.tool()
def odoo_prepare_inventory_adjustment(
    quant_id: int,
    counted_quantity: float,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_prepare_inventory_adjustment"):
        client = get_odoo_client()
        return prepare_inventory_adjustment(
            client,
            sender_id or client.odoo_session.uid,
            quant_id,
            counted_quantity,
        )


@mcp.tool()
def odoo_apply_inventory_adjustment(
    quant_id: int,
    counted_quantity: float,
    confirm: bool = False,
    dry_run: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_apply_inventory_adjustment"):
        client = get_odoo_client()
        return apply_inventory_adjustment(
            client,
            sender_id or client.odoo_session.uid,
            quant_id,
            counted_quantity,
            confirm,
            dry_run,
        )


@mcp.tool()
def odoo_find_purchase_receipts(
    purchase_order_id: int | None = None,
    partner_id: int | None = None,
    state: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_purchase_receipts"):
        client = get_odoo_client()
        return find_purchase_receipts(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            purchase_order_id=purchase_order_id,
            partner_id=partner_id,
            state=state,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
        )


@mcp.tool()
def odoo_get_receipt_summary(
    picking_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_receipt_summary"):
        client = get_odoo_client()
        return get_receipt_summary(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            picking_id=picking_id,
        )


@mcp.tool()
def odoo_match_receipt_to_purchase_order(
    picking_id: int,
    purchase_order_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_match_receipt_to_purchase_order"):
        client = get_odoo_client()
        return match_receipt_to_purchase_order(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            picking_id=picking_id,
            purchase_order_id=purchase_order_id,
        )


@mcp.tool()
def odoo_prepare_receipt_validation(
    picking_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_prepare_receipt_validation"):
        client = get_odoo_client()
        return prepare_receipt_validation(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            picking_id=picking_id,
        )


@mcp.tool()
def odoo_validate_receipt(
    picking_id: int,
    confirm: bool = False,
    dry_run: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_validate_receipt"):
        client = get_odoo_client()
        return validate_receipt(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            picking_id=picking_id,
            confirm=confirm,
            dry_run=dry_run,
        )


@mcp.tool()
def odoo_find_sale_deliveries(
    sale_order_id: int | None = None,
    partner_id: int | None = None,
    state: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_sale_deliveries"):
        client = get_odoo_client()
        return find_sale_deliveries(
            client, sender_id or client.odoo_session.uid, sale_order_id, partner_id,
            state, date_from, date_to, limit
        )


@mcp.tool()
def odoo_get_delivery_summary(picking_id: int, sender_id: int | None = None) -> dict:
    with measure_time("odoo_get_delivery_summary"):
        client = get_odoo_client()
        return get_delivery_summary(client, sender_id or client.odoo_session.uid, picking_id)


@mcp.tool()
def odoo_match_delivery_to_sale_order(
    picking_id: int,
    sale_order_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_match_delivery_to_sale_order"):
        client = get_odoo_client()
        return match_delivery_to_sale_order(
            client,
            sender_id or client.odoo_session.uid,
            picking_id,
            sale_order_id,
        )


@mcp.tool()
def odoo_prepare_delivery_validation(picking_id: int, sender_id: int | None = None) -> dict:
    with measure_time("odoo_prepare_delivery_validation"):
        client = get_odoo_client()
        return prepare_delivery_validation(client, sender_id or client.odoo_session.uid, picking_id)


@mcp.tool()
def odoo_validate_delivery(
    picking_id: int,
    confirm: bool = False,
    dry_run: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_validate_delivery"):
        client = get_odoo_client()
        return validate_delivery(
            client, sender_id or client.odoo_session.uid, picking_id, confirm, dry_run
        )


@mcp.tool()
def odoo_find_internal_transfers(
    state: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_internal_transfers"):
        client = get_odoo_client()
        return find_internal_transfers(
            client, sender_id or client.odoo_session.uid, state, date_from, date_to, limit
        )


@mcp.tool()
def odoo_find_lot_serial(
    name: str | None = None,
    product_id: int | None = None,
    company_id: int | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_lot_serial"):
        client = get_odoo_client()
        return find_lot_serial(
            client, sender_id or client.odoo_session.uid, name, product_id, company_id, limit
        )


@mcp.tool()
def odoo_get_lot_traceability(lot_id: int, sender_id: int | None = None) -> dict:
    with measure_time("odoo_get_lot_traceability"):
        client = get_odoo_client()
        return get_lot_traceability(client, sender_id or client.odoo_session.uid, lot_id)


@mcp.tool()
def odoo_check_lot_requirements(picking_id: int, sender_id: int | None = None) -> dict:
    with measure_time("odoo_check_lot_requirements"):
        client = get_odoo_client()
        return check_lot_requirements(client, sender_id or client.odoo_session.uid, picking_id)


@mcp.tool()
def odoo_get_transfer_summary(picking_id: int, sender_id: int | None = None) -> dict:
    with measure_time("odoo_get_transfer_summary"):
        client = get_odoo_client()
        return get_transfer_summary(client, sender_id or client.odoo_session.uid, picking_id)


@mcp.tool()
def odoo_prepare_transfer_validation(picking_id: int, sender_id: int | None = None) -> dict:
    with measure_time("odoo_prepare_transfer_validation"):
        client = get_odoo_client()
        return prepare_transfer_validation(client, sender_id or client.odoo_session.uid, picking_id)


@mcp.tool()
def odoo_validate_transfer(
    picking_id: int,
    confirm: bool = False,
    dry_run: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_validate_transfer"):
        client = get_odoo_client()
        return validate_transfer(
            client, sender_id or client.odoo_session.uid, picking_id, confirm, dry_run
        )


@mcp.tool()
def odoo_prepare_internal_transfer(
    location_id: int,
    location_dest_id: int,
    lines: list[dict[str, Any]],
    picking_type_id: int | None = None,
    origin: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_prepare_internal_transfer"):
        client = get_odoo_client()
        return prepare_internal_transfer(
            client,
            sender_id or client.odoo_session.uid,
            location_id,
            location_dest_id,
            lines,
            picking_type_id,
            origin,
        )


@mcp.tool()
def odoo_create_internal_transfer(
    location_id: int,
    location_dest_id: int,
    lines: list[dict[str, Any]],
    picking_type_id: int | None = None,
    origin: str | None = None,
    confirm: bool = False,
    dry_run: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_create_internal_transfer"):
        client = get_odoo_client()
        return create_internal_transfer(
            client,
            sender_id or client.odoo_session.uid,
            location_id,
            location_dest_id,
            lines,
            picking_type_id,
            origin,
            confirm,
            dry_run,
        )


@mcp.tool()
def odoo_find_stock_locations(
    name: str | None = None,
    usage: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_stock_locations"):
        client = get_odoo_client()
        return find_stock_locations(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            name=name,
            usage=usage,
            limit=limit,
        )


@mcp.tool()
def odoo_get_location_stock_summary(
    location_id: int,
    product_id: int | None = None,
    limit: int = 100,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_location_stock_summary"):
        client = get_odoo_client()
        return get_location_stock_summary(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            location_id=location_id,
            product_id=product_id,
            limit=limit,
        )


@mcp.tool()
def odoo_get_stock_moves(
    product_id: int | None = None,
    picking_id: int | None = None,
    state: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_stock_moves"):
        client = get_odoo_client()
        return get_stock_moves(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            product_id=product_id,
            picking_id=picking_id,
            state=state,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
        )


@mcp.tool()
def odoo_explain_stock_forecast(
    product_id: int,
    limit: int = 20,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_explain_stock_forecast"):
        client = get_odoo_client()
        return explain_stock_forecast(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            product_id=product_id,
            limit=limit,
        )


@mcp.tool()
def odoo_get_product_stock(
    product_id: int,
    location_id: int | None = None,
    sender_id: int | None = None,
) -> list:
    """Returns stock quantities (on hand, reserved) for a given product."""
    with measure_time("odoo_get_product_stock"):
        client = get_odoo_client()
        return get_product_stock(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            product_id=product_id,
            location_id=location_id,
        )


@mcp.tool()
def odoo_log_timesheet(
    project_id: int,
    name: str,
    unit_amount: float,
    date: str | None = None,
    task_id: int | None = None,
    employee_id: int | None = None,
    sender_id: int | None = None,
) -> int:
    """Logs a timesheet entry for a project or task."""
    with measure_time("odoo_log_timesheet"):
        client = get_odoo_client()
        return log_timesheet(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            project_id=project_id,
            name=name,
            unit_amount=unit_amount,
            date=date,
            task_id=task_id,
            employee_id=employee_id,
        )


@mcp.tool()
def odoo_find_attendance(
    user_id: int | None = None,
    employee_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> list:
    """Lists attendance entries (hr.attendance) for a user/employee and date range."""
    with measure_time("odoo_find_attendance"):
        client = get_odoo_client()
        return find_attendance(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            user_id=user_id,
            employee_id=employee_id,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
        )


@mcp.tool()
def odoo_log_task_timesheet(
    task_id: int,
    name: str,
    unit_amount: float,
    employee_id: int | None = None,
    date: str | None = None,
    sender_id: int | None = None,
) -> int:
    """Logs timesheet hours directly to a task, resolving project_id automatically."""
    with measure_time("odoo_log_task_timesheet"):
        client = get_odoo_client()
        return log_task_timesheet(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            task_id=task_id,
            name=name,
            unit_amount=unit_amount,
            employee_id=employee_id,
            date=date,
        )


@mcp.tool()
def odoo_check_in(
    employee_id: int | None = None,
    check_in_at: str | None = None,
    sender_id: int | None = None,
) -> dict:
    """Registers attendance check-in for current user or selected employee."""
    with measure_time("odoo_check_in"):
        client = get_odoo_client()
        return check_in(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            employee_id=employee_id,
            check_in_at=check_in_at,
        )


@mcp.tool()
def odoo_check_out(
    employee_id: int | None = None,
    check_out_at: str | None = None,
    sender_id: int | None = None,
) -> dict:
    """Registers attendance check-out for current user or selected employee."""
    with measure_time("odoo_check_out"):
        client = get_odoo_client()
        return check_out(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            employee_id=employee_id,
            check_out_at=check_out_at,
        )


@mcp.tool()
def odoo_get_my_today_summary(
    employee_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_my_today_summary"):
        client = get_odoo_client()
        return get_my_today_summary(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            employee_id=employee_id,
        )


@mcp.tool()
def odoo_find_missing_timesheets(
    employee_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    tolerance_hours: float = 0.5,
    sender_id: int | None = None,
) -> list:
    with measure_time("odoo_find_missing_timesheets"):
        client = get_odoo_client()
        return find_missing_timesheets(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            employee_id=employee_id,
            date_from=date_from,
            date_to=date_to,
            tolerance_hours=tolerance_hours,
        )


@mcp.tool()
def odoo_suggest_timesheet_from_attendance(
    employee_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    tolerance_hours: float = 0.5,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_suggest_timesheet_from_attendance"):
        client = get_odoo_client()
        return suggest_timesheet_from_attendance(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            employee_id=employee_id,
            date_from=date_from,
            date_to=date_to,
            tolerance_hours=tolerance_hours,
        )


@mcp.tool()
def odoo_create_expense_report(
    name: str,
    expense_ids: list[int] | None = None,
    employee_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_create_expense_report"):
        client = get_odoo_client()
        return create_expense_report(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            name=name,
            expense_ids=expense_ids,
            employee_id=employee_id,
            date_from=date_from,
            date_to=date_to,
        )


@mcp.tool()
def odoo_submit_expense_report(
    sheet_id: int,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_submit_expense_report"):
        client = get_odoo_client()
        return submit_expense_report(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            sheet_id=sheet_id,
        )


@mcp.tool()
def odoo_approve_expense(
    sheet_id: int,
    approve: bool = True,
    reason: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_approve_expense"):
        client = get_odoo_client()
        return approve_expense(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            sheet_id=sheet_id,
            approve=approve,
            reason=reason,
        )


@mcp.tool()
def odoo_notify_pending_actions(
    employee_id: int | None = None,
    days_back: int = 7,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_notify_pending_actions"):
        client = get_odoo_client()
        return notify_pending_actions(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            employee_id=employee_id,
            days_back=days_back,
        )


@mcp.tool()
def odoo_register_payment(
    invoice_id: int,
    amount: float,
    payment_date: str | None = None,
    journal_id: int | None = None,
    sender_id: int | None = None,
) -> bool:
    """Registers a payment for a specific customer or vendor invoice."""
    with measure_time("odoo_register_payment"):
        client = get_odoo_client()
        return register_payment(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            invoice_id=invoice_id,
            amount=amount,
            payment_date=payment_date,
            journal_id=journal_id,
        )


@mcp.tool()
def odoo_find_unreconciled_bank_lines(
    journal_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    amount_min: float | None = None,
    amount_max: float | None = None,
    limit: int = 50,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_unreconciled_bank_lines"):
        client = get_odoo_client()
        return find_unreconciled_bank_lines(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            journal_id=journal_id,
            date_from=date_from,
            date_to=date_to,
            amount_min=amount_min,
            amount_max=amount_max,
            limit=limit,
        )


@mcp.tool()
def odoo_suggest_bank_reconciliation(
    statement_line_id: int,
    tolerance_amount: float = 0.05,
    days_window: int = 30,
    limit: int = 10,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_suggest_bank_reconciliation"):
        client = get_odoo_client()
        return suggest_bank_reconciliation(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            statement_line_id=statement_line_id,
            tolerance_amount=tolerance_amount,
            days_window=days_window,
            limit=limit,
        )


@mcp.tool()
def odoo_reconcile_bank_line(
    statement_line_id: int,
    move_line_ids: list[int],
    confirm: bool = False,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_reconcile_bank_line"):
        client = get_odoo_client()
        return reconcile_bank_line(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            statement_line_id=statement_line_id,
            move_line_ids=move_line_ids,
            confirm=confirm,
        )


@mcp.tool()
def odoo_register_invoice_payment(
    invoice_id: int,
    amount: float,
    payment_date: str | None = None,
    journal_id: int | None = None,
    memo: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_register_invoice_payment"):
        client = get_odoo_client()
        return register_invoice_payment(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            invoice_id=invoice_id,
            amount=amount,
            payment_date=payment_date,
            journal_id=journal_id,
            memo=memo,
        )


@mcp.tool()
def odoo_get_ar_ap_aging(
    report_type: str = "receivable",
    as_of: str | None = None,
    company_id: int | None = None,
    limit: int = 50,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_ar_ap_aging"):
        client = get_odoo_client()
        return get_ar_ap_aging(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            report_type=report_type,
            as_of=as_of,
            company_id=company_id,
            limit=limit,
        )


@mcp.tool()
def odoo_run_period_close_checks(
    period_start: str | None = None,
    period_end: str | None = None,
    company_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_run_period_close_checks"):
        client = get_odoo_client()
        return run_period_close_checks(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            period_start=period_start,
            period_end=period_end,
            company_id=company_id,
        )


@mcp.tool()
def odoo_create_journal_entry(
    journal_id: int,
    lines: list[JournalEntryLineSchema],
    date: str | None = None,
    ref: str | None = None,
    company_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_create_journal_entry"):
        client = get_odoo_client()
        return create_journal_entry(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            journal_id=journal_id,
            entry_date=date,
            lines=[line.model_dump(exclude_none=True) for line in lines],
            ref=ref,
            company_id=company_id,
        )


@mcp.tool()
def odoo_post_journal_entry(
    move_id: int,
    confirm: bool = False,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_post_journal_entry"):
        client = get_odoo_client()
        return post_journal_entry(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            move_id=move_id,
            confirm=confirm,
        )


@mcp.tool()
def odoo_get_tax_summary(
    date_from: str | None = None,
    date_to: str | None = None,
    company_id: int | None = None,
    tax_group_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_tax_summary"):
        client = get_odoo_client()
        return get_tax_summary(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            date_from=date_from,
            date_to=date_to,
            company_id=company_id,
            tax_group_id=tax_group_id,
        )


@mcp.tool()
def odoo_validate_vendor_bill_duplicate(
    partner_id: int,
    vendor_bill_number: str,
    invoice_date: str | None = None,
    amount_total: float | None = None,
    currency_id: int | None = None,
    tolerance: float = 0.01,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_validate_vendor_bill_duplicate"):
        client = get_odoo_client()
        return validate_vendor_bill_duplicate(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            partner_id=partner_id,
            vendor_bill_number=vendor_bill_number,
            invoice_date=invoice_date,
            amount_total=amount_total,
            currency_id=currency_id,
            tolerance=tolerance,
        )


@mcp.tool()
def odoo_suggest_expense_account_and_taxes(
    description: str,
    amount: float | None = None,
    partner_id: int | None = None,
    product_id: int | None = None,
    company_id: int | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_suggest_expense_account_and_taxes"):
        client = get_odoo_client()
        return suggest_expense_account_and_taxes(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            description=description,
            amount=amount,
            partner_id=partner_id,
            product_id=product_id,
            company_id=company_id,
        )


@mcp.tool()
def odoo_create_vendor_bill_from_ocr_validated(
    ocr_payload: dict[str, Any],
    attachment_id: int | None = None,
    confirm: bool = False,
    dry_run: bool = True,
    company_id: int | None = None,
    allowed_company_ids: list[int] | None = None,
    total_tolerance: float = 0.01,
    vendor_create_policy: str = "propose_create",
    confirm_partner_create: bool = False,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_create_vendor_bill_from_ocr_validated"):
        client = get_odoo_client()
        return create_vendor_bill_from_ocr_validated(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            ocr_payload=ocr_payload,
            attachment_id=attachment_id,
            confirm=confirm,
            dry_run=dry_run,
            company_id=company_id,
            allowed_company_ids=allowed_company_ids,
            total_tolerance=total_tolerance,
            vendor_create_policy=vendor_create_policy,
            confirm_partner_create=confirm_partner_create,
        )


@mcp.tool()
def odoo_get_view_by_xmlid(
    xmlid: str,
    include_inherited_chain: bool = False,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_view_by_xmlid"):
        client = get_odoo_client()
        return get_view_by_xmlid(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlid=xmlid,
            include_inherited_chain=include_inherited_chain,
        )


@mcp.tool()
def odoo_find_views_by_model(
    model: str,
    view_type: str | None = None,
    limit: int = DEFAULT_SEARCH_LIMIT,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_find_views_by_model"):
        client = get_odoo_client()
        return find_views_by_model(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            model=model,
            view_type=view_type,
            limit=limit,
        )


@mcp.tool()
def odoo_get_report_template(
    xmlid: str,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_get_report_template"):
        client = get_odoo_client()
        return get_report_template(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlid=xmlid,
        )


@mcp.tool()
def odoo_scan_view_migration_issues(
    xmlid: str,
    target_version: str | None = None,
    rule_sets: list[str] | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_scan_view_migration_issues"):
        client = get_odoo_client()
        return scan_view_migration_issues(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlid=xmlid,
            target_version=target_version,
            rule_sets=rule_sets,
        )


@mcp.tool()
def odoo_scan_report_migration_issues(
    xmlid: str,
    target_version: str | None = None,
    rule_sets: list[str] | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_scan_report_migration_issues"):
        client = get_odoo_client()
        return scan_report_migration_issues(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlid=xmlid,
            target_version=target_version,
            rule_sets=rule_sets,
        )


@mcp.tool()
def odoo_propose_view_patch(
    xmlid: str,
    intent: str,
    constraints: list[str] | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_propose_view_patch"):
        client = get_odoo_client()
        return propose_view_patch(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlid=xmlid,
            intent=intent,
            constraints=constraints,
        )


@mcp.tool()
def odoo_propose_report_patch(
    xmlid: str,
    intent: str,
    constraints: list[str] | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_propose_report_patch"):
        client = get_odoo_client()
        return propose_report_patch(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlid=xmlid,
            intent=intent,
            constraints=constraints,
        )


@mcp.tool()
def odoo_validate_view_patch(
    base_view_xmlid: str,
    patch: str,
    strict: bool = True,
    target_version: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_validate_view_patch"):
        client = get_odoo_client()
        return validate_view_patch(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            base_view_xmlid=base_view_xmlid,
            patch=patch,
            strict=strict,
            target_version=target_version,
        )


@mcp.tool()
def odoo_validate_report_patch(
    report_xmlid: str,
    patch: str,
    strict: bool = True,
    target_version: str | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_validate_report_patch"):
        client = get_odoo_client()
        return validate_report_patch(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            report_xmlid=report_xmlid,
            patch=patch,
            strict=strict,
            target_version=target_version,
        )


@mcp.tool()
def odoo_preview_view_patch(
    base_view_xmlid: str,
    patch: str,
    diff_format: str = "unified",
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_preview_view_patch"):
        client = get_odoo_client()
        return preview_view_patch(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            base_view_xmlid=base_view_xmlid,
            patch=patch,
            diff_format=diff_format,
        )


@mcp.tool()
def odoo_preview_report_patch(
    report_xmlid: str,
    patch: str,
    diff_format: str = "unified",
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_preview_report_patch"):
        client = get_odoo_client()
        return preview_report_patch(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            report_xmlid=report_xmlid,
            patch=patch,
            diff_format=diff_format,
        )


@mcp.tool()
def odoo_test_view_compilation(
    view_xmlid: str,
    context: dict[str, Any] | None = None,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_test_view_compilation"):
        client = get_odoo_client()
        return test_view_compilation(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            view_xmlid=view_xmlid,
            context=context,
        )


@mcp.tool()
def odoo_apply_view_patch_safe(
    base_view_xmlid: str,
    patch: str,
    strict: bool = True,
    confirm: bool = False,
    dry_run: bool = True,
    inherited_view_name: str | None = None,
    priority: int = 99,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_apply_view_patch_safe"):
        client = get_odoo_client()
        return apply_view_patch_safe(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            base_view_xmlid=base_view_xmlid,
            patch=patch,
            strict=strict,
            confirm=confirm,
            dry_run=dry_run,
            inherited_view_name=inherited_view_name,
            priority=priority,
        )


@mcp.tool()
def odoo_apply_report_patch_safe(
    report_xmlid: str,
    patch: str,
    strict: bool = True,
    confirm: bool = False,
    dry_run: bool = True,
    inherited_view_name: str | None = None,
    priority: int = 99,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_apply_report_patch_safe"):
        client = get_odoo_client()
        return apply_report_patch_safe(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            report_xmlid=report_xmlid,
            patch=patch,
            strict=strict,
            confirm=confirm,
            dry_run=dry_run,
            inherited_view_name=inherited_view_name,
            priority=priority,
        )


@mcp.tool()
def odoo_rollback_patch_safe(
    snapshot: dict[str, Any],
    confirm: bool = False,
    dry_run: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_rollback_patch_safe"):
        client = get_odoo_client()
        return rollback_patch_safe(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            snapshot=snapshot,
            confirm=confirm,
            dry_run=dry_run,
        )


@mcp.tool()
def odoo_assist_view_migration(
    xmlid: str,
    target_version: str | None = None,
    intent: str | None = None,
    constraints: list[str] | None = None,
    strict: bool = True,
    include_compile_test: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_assist_view_migration"):
        client = get_odoo_client()
        return assist_view_migration(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlid=xmlid,
            target_version=target_version,
            intent=intent,
            constraints=constraints,
            strict=strict,
            include_compile_test=include_compile_test,
        )


@mcp.tool()
def odoo_assist_report_migration(
    xmlid: str,
    target_version: str | None = None,
    intent: str | None = None,
    constraints: list[str] | None = None,
    strict: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_assist_report_migration"):
        client = get_odoo_client()
        return assist_report_migration(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlid=xmlid,
            target_version=target_version,
            intent=intent,
            constraints=constraints,
            strict=strict,
        )


@mcp.tool()
def odoo_visualize_view_patch(
    base_view_xmlid: str,
    patch: str,
    diff_format: str = "unified",
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_visualize_view_patch"):
        client = get_odoo_client()
        return visualize_view_patch(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            base_view_xmlid=base_view_xmlid,
            patch=patch,
            diff_format=diff_format,
        )


@mcp.tool()
def odoo_visualize_report_patch(
    report_xmlid: str,
    patch: str,
    diff_format: str = "unified",
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_visualize_report_patch"):
        client = get_odoo_client()
        return visualize_report_patch(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            report_xmlid=report_xmlid,
            patch=patch,
            diff_format=diff_format,
        )


@mcp.tool()
def odoo_batch_assist_view_migration(
    xmlids: list[str],
    target_version: str | None = None,
    intent: str | None = None,
    constraints: list[str] | None = None,
    strict: bool = True,
    include_compile_test: bool = True,
    continue_on_error: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_batch_assist_view_migration"):
        client = get_odoo_client()
        return batch_assist_view_migration(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlids=xmlids,
            target_version=target_version,
            intent=intent,
            constraints=constraints,
            strict=strict,
            include_compile_test=include_compile_test,
            continue_on_error=continue_on_error,
        )


@mcp.tool()
def odoo_batch_assist_report_migration(
    xmlids: list[str],
    target_version: str | None = None,
    intent: str | None = None,
    constraints: list[str] | None = None,
    strict: bool = True,
    continue_on_error: bool = True,
    sender_id: int | None = None,
) -> dict:
    with measure_time("odoo_batch_assist_report_migration"):
        client = get_odoo_client()
        return batch_assist_report_migration(
            client=client,
            sender_id=sender_id or client.odoo_session.uid,
            xmlids=xmlids,
            target_version=target_version,
            intent=intent,
            constraints=constraints,
            strict=strict,
            continue_on_error=continue_on_error,
        )
