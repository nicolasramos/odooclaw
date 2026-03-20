import os
import sys
from typing import Any
from functools import lru_cache
from mcp.server.fastmcp import FastMCP

from odoo_mcp.core.session import OdooSession
from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger
from odoo_mcp.observability.metrics import measure_time

from odoo_mcp.tools import records, actions, introspection, partners, purchases, accounting, chatter, projects, sales, generic
from odoo_mcp.schemas.records import OdooSearchSchema, OdooReadSchema, OdooSearchReadSchema, OdooCreateSchema, OdooWriteSchema
from odoo_mcp.schemas.actions import OdooInvokeActionSchema
from odoo_mcp.schemas.business import FindPartnerSchema, CreatePurchaseOrderSchema, CreateVendorInvoiceSchema, GetPartnerSummarySchema, CreateActivitySchema, ListPendingActivitiesSchema, MarkActivityDoneSchema, PostChatterMessageSchema, FindTaskSchema, CreateTaskSchema, UpdateTaskSchema, FindSaleOrderSchema, GetSaleOrderSummarySchema, GetRecordSummarySchema, FindPendingInvoicesSchema, GetInvoiceSummarySchema, GetModelSchemaSchema, CreateCalendarEventSchema, CreateSaleOrderSchema, ConfirmSaleOrderSchema, CreateLeadSchema, GetProductStockSchema, LogTimesheetSchema, RegisterPaymentSchema
from odoo_mcp.services.invoice_service import find_pending_invoices, get_invoice_summary, register_payment
from odoo_mcp.services.calendar_service import create_calendar_event
from odoo_mcp.services.sales_service import create_sale_order, confirm_sale_order
from odoo_mcp.services.crm_service import create_lead
from odoo_mcp.services.inventory_service import get_product_stock
from odoo_mcp.services.hr_service import log_timesheet

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
- Customer invoices pending: [["state","=","posted"],["payment_state","in",["not_paid","partial"]],["move_type","=","out_invoice"]]
- Vendor bills pending: [["state","=","posted"],["payment_state","in",["not_paid","partial"]],["move_type","=","in_invoice"]]
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
    client = get_odoo_client()
    return "List of models available via introspect tool..."

@mcp.resource("odoo://model/{model_name}/schema")
def get_model_schema(model_name: str) -> str:
    client = get_odoo_client()
    return introspection.odoo_model_schema(client, client.odoo_session.uid, model_name)

@mcp.resource("odoo://record/{model}/{id}/summary")
def get_resource_record_summary(model: str, id: str) -> str:
    client = get_odoo_client()
    import json
    res = generic.odoo_get_record_summary(client, client.odoo_session.uid, model, int(id))
    return json.dumps(res, indent=2)

@mcp.resource("odoo://record/{model}/{id}/chatter_summary")
def get_resource_chatter_summary(model: str, id: str) -> str:
    client = get_odoo_client()
    from odoo_mcp.services.generic_service import get_chatter_summary
    import json
    res = get_chatter_summary(client, client.odoo_session.uid, model, int(id))
    return json.dumps(res, indent=2)

# Tools (Capa 2, 3, 4)
@mcp.tool()
def odoo_search(payload: OdooSearchSchema) -> list:
    with measure_time("odoo_search"):
        client = get_odoo_client()
        return records.odoo_search(client, payload.sender_id or client.odoo_session.uid, payload.model, payload.domain, payload.limit)

@mcp.tool()
def odoo_read(payload: OdooReadSchema) -> list:
    with measure_time("odoo_read"):
        client = get_odoo_client()
        return records.odoo_read(client, payload.sender_id or client.odoo_session.uid, payload.model, payload.ids, payload.fields)

@mcp.tool()
def odoo_create(payload: OdooCreateSchema) -> int:
    with measure_time("odoo_create"):
        client = get_odoo_client()
        return records.odoo_create(client, payload.sender_id or client.odoo_session.uid, payload.model, payload.values)

@mcp.tool()
def odoo_write(payload: OdooWriteSchema) -> bool:
    with measure_time("odoo_write"):
        client = get_odoo_client()
        return records.odoo_write(client, payload.sender_id or client.odoo_session.uid, payload.model, payload.ids, payload.values)

@mcp.tool()
def odoo_invoke_action(payload: OdooInvokeActionSchema) -> Any:
    with measure_time("odoo_invoke_action"):
        client = get_odoo_client()
        return actions.odoo_invoke_action(client, payload.sender_id or client.odoo_session.uid, payload.model, payload.method, payload.ids)

@mcp.tool()
def odoo_find_partner(payload: FindPartnerSchema) -> int:
    with measure_time("odoo_find_partner"):
        client = get_odoo_client()
        return partners.odoo_find_partner(client, payload.sender_id or client.odoo_session.uid, payload.name, payload.vat, payload.email)

@mcp.tool()
def odoo_get_partner_summary(payload: GetPartnerSummarySchema) -> dict:
    with measure_time("odoo_get_partner_summary"):
        client = get_odoo_client()
        return partners.odoo_get_partner_summary(client, payload.sender_id or client.odoo_session.uid, payload.partner_id)

@mcp.tool()
def odoo_create_activity(payload: CreateActivitySchema) -> int:
    with measure_time("odoo_create_activity"):
        client = get_odoo_client()
        return chatter.odoo_create_activity(client, payload.sender_id or client.odoo_session.uid, payload.model, payload.res_id, payload.summary, payload.note, payload.user_id)

@mcp.tool()
def odoo_list_pending_activities(payload: ListPendingActivitiesSchema) -> list:
    with measure_time("odoo_list_pending_activities"):
        client = get_odoo_client()
        return chatter.odoo_list_pending_activities(client, payload.sender_id or client.odoo_session.uid, payload.model, payload.user_id)

@mcp.tool()
def odoo_mark_activity_done(payload: MarkActivityDoneSchema) -> bool:
    with measure_time("odoo_mark_activity_done"):
        client = get_odoo_client()
        return chatter.odoo_mark_activity_done(client, payload.sender_id or client.odoo_session.uid, payload.activity_id, payload.feedback)

@mcp.tool()
def odoo_post_chatter_message(payload: PostChatterMessageSchema) -> int:
    with measure_time("odoo_post_chatter_message"):
        client = get_odoo_client()
        return chatter.odoo_post_chatter_message(client, payload.sender_id or client.odoo_session.uid, payload.model, payload.res_id, payload.body)

@mcp.tool()
def odoo_find_task(payload: FindTaskSchema) -> list:
    with measure_time("odoo_find_task"):
        client = get_odoo_client()
        return projects.odoo_find_task(client, payload.sender_id or client.odoo_session.uid, payload.name, payload.project_id, payload.stage_id, payload.limit)

@mcp.tool()
def odoo_create_task(payload: CreateTaskSchema) -> int:
    with measure_time("odoo_create_task"):
        client = get_odoo_client()
        return projects.odoo_create_task(client, payload.sender_id or client.odoo_session.uid, payload.name, payload.project_id, payload.description, payload.assigned_to, payload.deadline)

@mcp.tool()
def odoo_update_task(payload: UpdateTaskSchema) -> bool:
    with measure_time("odoo_update_task"):
        client = get_odoo_client()
        return projects.odoo_update_task(client, payload.sender_id or client.odoo_session.uid, payload.task_id, payload.stage_id, payload.assigned_to, payload.deadline)

@mcp.tool()
def odoo_find_sale_order(payload: FindSaleOrderSchema) -> list:
    with measure_time("odoo_find_sale_order"):
        client = get_odoo_client()
        return sales.odoo_find_sale_order(client, payload.sender_id or client.odoo_session.uid, payload.name, payload.partner_id, payload.state, payload.limit)

@mcp.tool()
def odoo_get_sale_order_summary(payload: GetSaleOrderSummarySchema) -> dict:
    with measure_time("odoo_get_sale_order_summary"):
        client = get_odoo_client()
        return sales.odoo_get_sale_order_summary(client, payload.sender_id or client.odoo_session.uid, payload.order_id)

@mcp.tool()
def odoo_get_record_summary(payload: GetRecordSummarySchema) -> dict:
    with measure_time("odoo_get_record_summary"):
        client = get_odoo_client()
        return generic.odoo_get_record_summary(client, payload.sender_id or client.odoo_session.uid, payload.model, payload.res_id)

@mcp.tool()
def odoo_create_purchase_order(payload: CreatePurchaseOrderSchema) -> int:
    with measure_time("odoo_create_purchase_order"):
        client = get_odoo_client()
        return purchases.odoo_create_purchase_order(client, payload.sender_id or client.odoo_session.uid, payload.partner_id, [line.dict() for line in payload.lines])

@mcp.tool()
def odoo_create_vendor_invoice(payload: CreateVendorInvoiceSchema) -> int:
    with measure_time("odoo_create_vendor_invoice"):
        client = get_odoo_client()
        return accounting.odoo_create_vendor_invoice(client, payload.sender_id or client.odoo_session.uid, payload.partner_id, [line.dict() for line in payload.lines], payload.ref)

if __name__ == "__main__":
    mcp.run()


@mcp.tool()
def odoo_find_pending_invoices(payload: FindPendingInvoicesSchema) -> list:
    """
    Find invoices/bills pending payment for a partner.
    Uses correct Odoo 18 domains: state='posted' AND payment_state in ('not_paid','partial').
    DO NOT use state='open' - that is Odoo 13 and does NOT exist in Odoo 18.
    Omit partner_id to get ALL pending invoices.
    """
    with measure_time("odoo_find_pending_invoices"):
        client = get_odoo_client()
        return find_pending_invoices(
            client,
            payload.sender_id or client.odoo_session.uid,
            payload.partner_id,
            payload.move_type,
            payload.limit
        )


@mcp.tool()
def odoo_get_invoice_summary(payload: GetInvoiceSummarySchema) -> dict:
    """Get complete details of a specific invoice (account.move), including lines."""
    with measure_time("odoo_get_invoice_summary"):
        client = get_odoo_client()
        return get_invoice_summary(client, payload.sender_id or client.odoo_session.uid, payload.move_id)


@mcp.tool()
def odoo_get_model_schema(payload: GetModelSchemaSchema) -> str:
    """Retrieve the fields and schema for a given Odoo model (e.g. 'res.partner'). Very useful if a field search fails."""
    with measure_time("odoo_get_model_schema"):
        client = get_odoo_client()
        return introspection.odoo_model_schema(client, payload.sender_id or client.odoo_session.uid, payload.model)


@mcp.tool()
def odoo_create_calendar_event(payload: CreateCalendarEventSchema) -> int:
    """Creates a calendar event (appointment or meeting) handling multiple attendees automatically."""
    with measure_time("odoo_create_calendar_event"):
        client = get_odoo_client()
        return create_calendar_event(
            client=client,
            sender_id=payload.sender_id or client.odoo_session.uid,
            name=payload.name,
            start=payload.start,
            stop=payload.stop,
            partner_ids=payload.partner_ids,
            allday=payload.allday,
            description=payload.description
        )

@mcp.tool()
def odoo_create_sale_order(payload: CreateSaleOrderSchema) -> int:
    """Creates a sale order (presupuesto) for a customer with product lines."""
    with measure_time("odoo_create_sale_order"):
        client = get_odoo_client()
        return create_sale_order(
            client=client,
            sender_id=payload.sender_id or client.odoo_session.uid,
            partner_id=payload.partner_id,
            lines=payload.lines
        )

@mcp.tool()
def odoo_confirm_sale_order(payload: ConfirmSaleOrderSchema) -> bool:
    """Confirms a sale order, moving it from draft/sent to 'sale' status."""
    with measure_time("odoo_confirm_sale_order"):
        client = get_odoo_client()
        return confirm_sale_order(
            client=client,
            sender_id=payload.sender_id or client.odoo_session.uid,
            order_id=payload.order_id
        )

@mcp.tool()
def odoo_create_lead(payload: CreateLeadSchema) -> int:
    """Creates a new CRM Lead / Opportunity."""
    with measure_time("odoo_create_lead"):
        client = get_odoo_client()
        return create_lead(
            client=client,
            sender_id=payload.sender_id or client.odoo_session.uid,
            name=payload.name,
            partner_id=payload.partner_id,
            expected_revenue=payload.expected_revenue,
            probability=payload.probability,
            description=payload.description
        )

@mcp.tool()
def odoo_get_product_stock(payload: GetProductStockSchema) -> list:
    """Returns stock quantities (on hand, reserved) for a given product."""
    with measure_time("odoo_get_product_stock"):
        client = get_odoo_client()
        return get_product_stock(
            client=client,
            sender_id=payload.sender_id or client.odoo_session.uid,
            product_id=payload.product_id,
            location_id=payload.location_id
        )

@mcp.tool()
def odoo_log_timesheet(payload: LogTimesheetSchema) -> int:
    """Logs a timesheet entry for a project or task."""
    with measure_time("odoo_log_timesheet"):
        client = get_odoo_client()
        return log_timesheet(
            client=client,
            sender_id=payload.sender_id or client.odoo_session.uid,
            project_id=payload.project_id,
            name=payload.name,
            unit_amount=payload.unit_amount,
            date=payload.date,
            task_id=payload.task_id,
            employee_id=payload.employee_id
        )

@mcp.tool()
def odoo_register_payment(payload: RegisterPaymentSchema) -> bool:
    """Registers a payment for a specific customer or vendor invoice."""
    with measure_time("odoo_register_payment"):
        client = get_odoo_client()
        return register_payment(
            client=client,
            sender_id=payload.sender_id or client.odoo_session.uid,
            invoice_id=payload.invoice_id,
            amount=payload.amount,
            payment_date=payload.payment_date,
            journal_id=payload.journal_id
        )


