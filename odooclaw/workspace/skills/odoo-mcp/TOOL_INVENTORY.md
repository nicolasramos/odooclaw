# Odoo MCP — Tool Inventory

Single source of truth for all 130 tools and 5 resources in the odoo-mcp server.
**Source**: `odooclaw/workspace/skills/odoo-mcp/src/odoo_mcp/server.py`
**Generated**: 2026-10-13

---

## Summary

| Category | Tools |
|---|---|
| accounting | 16 |
| accounting_legacy | 1 |
| actions | 1 |
| admin | 1 |
| attachments | 1 |
| calendar | 1 |
| chatter_activities | 5 |
| chatter_messages | 1 |
| contracts | 3 |
| crm_leads | 1 |
| crm_partners | 2 |
| crud_core | 5 |
| deliveries | 5 |
| helpdesk | 3 |
| hr | 12 |
| introspection | 3 |
| inventory | 12 |
| lot_serial | 3 |
| products | 4 |
| project_tasks | 7 |
| purchase_orders | 7 |
| receipts | 5 |
| sales_orders | 4 |
| transfers | 6 |
| views | 21 |
| **Total** | **130** |

**Resources**: 5

---

## accounting (16 tools)

- `odoo_create_journal_entry`
- `odoo_create_vendor_bill_from_ocr_validated`
- `odoo_find_pending_invoices`
- `odoo_find_unreconciled_bank_lines`
- `odoo_get_ar_ap_aging`
- `odoo_get_financial_snapshot`
- `odoo_get_invoice_summary`
- `odoo_get_tax_summary`
- `odoo_post_journal_entry`
- `odoo_reconcile_bank_line`
- `odoo_register_invoice_payment`
- `odoo_register_payment`
- `odoo_run_period_close_checks`
- `odoo_suggest_bank_reconciliation`
- `odoo_suggest_expense_account_and_taxes`
- `odoo_validate_vendor_bill_duplicate`

## accounting_legacy (1 tools)

- `odoo_create_vendor_invoice`

## actions (1 tools)

- `odoo_invoke_action`

## admin (1 tools)

- `reset_allowed_models_cache`

## attachments (1 tools)

- `odoo_attach_file_to_chat`

## calendar (1 tools)

- `odoo_create_calendar_event`

## chatter_activities (5 tools)

- `odoo_close_activity_with_reason`
- `odoo_create_activity`
- `odoo_create_activity_summary`
- `odoo_list_pending_activities`
- `odoo_mark_activity_done`

## chatter_messages (1 tools)

- `odoo_post_chatter_message`

## contracts (3 tools)

- `odoo_close_contract_line`
- `odoo_create_contract_line`
- `odoo_replace_contract_line`

## crm_leads (1 tools)

- `odoo_create_lead`

## crm_partners (2 tools)

- `odoo_find_partner`
- `odoo_get_partner_summary`

## crud_core (5 tools)

- `odoo_create`
- `odoo_read`
- `odoo_search`
- `odoo_search_read`
- `odoo_write`

## deliveries (5 tools)

- `odoo_find_sale_deliveries`
- `odoo_get_delivery_summary`
- `odoo_match_delivery_to_sale_order`
- `odoo_prepare_delivery_validation`
- `odoo_validate_delivery`

## helpdesk (3 tools)

- `odoo_create_helpdesk_ticket`
- `odoo_create_helpdesk_ticket_from_partner`
- `odoo_draft_ticket_email`

## hr (12 tools)

- `odoo_approve_expense`
- `odoo_check_in`
- `odoo_check_out`
- `odoo_create_expense_report`
- `odoo_find_attendance`
- `odoo_find_missing_timesheets`
- `odoo_get_my_today_summary`
- `odoo_log_task_timesheet`
- `odoo_log_timesheet`
- `odoo_notify_pending_actions`
- `odoo_submit_expense_report`
- `odoo_suggest_timesheet_from_attendance`

## introspection (3 tools)

- `odoo_get_capabilities`
- `odoo_get_model_schema`
- `odoo_get_record_summary`

## inventory (12 tools)

- `odoo_apply_inventory_adjustment`
- `odoo_explain_stock_forecast`
- `odoo_find_inventory_discrepancies`
- `odoo_find_reordering_rules`
- `odoo_find_stock_locations`
- `odoo_get_location_stock_summary`
- `odoo_get_logistics_capabilities`
- `odoo_get_product_stock`
- `odoo_get_replenishment_suggestions`
- `odoo_get_stock_availability`
- `odoo_get_stock_moves`
- `odoo_prepare_inventory_adjustment`

## lot_serial (3 tools)

- `odoo_check_lot_requirements`
- `odoo_find_lot_serial`
- `odoo_get_lot_traceability`

## products (4 tools)

- `odoo_find_product`
- `odoo_get_product_stock_context`
- `odoo_get_product_summary`
- `odoo_get_product_supplier_info`

## project_tasks (7 tools)

- `odoo_create_task`
- `odoo_find_my_tasks`
- `odoo_find_task`
- `odoo_find_tasks_for_user`
- `odoo_get_task_stats`
- `odoo_update_task`
- `odoo_update_task_status`

## purchase_orders (7 tools)

- `odoo_create_purchase_order`
- `odoo_find_purchase_order`
- `odoo_get_purchase_invoice_status`
- `odoo_get_purchase_order_summary`
- `odoo_get_purchase_receipt_status`
- `odoo_match_vendor_bill_to_purchase_order`
- `odoo_suggest_vendor_products`

## receipts (5 tools)

- `odoo_find_purchase_receipts`
- `odoo_get_receipt_summary`
- `odoo_match_receipt_to_purchase_order`
- `odoo_prepare_receipt_validation`
- `odoo_validate_receipt`

## sales_orders (4 tools)

- `odoo_confirm_sale_order`
- `odoo_create_sale_order`
- `odoo_find_sale_order`
- `odoo_get_sale_order_summary`

## transfers (6 tools)

- `odoo_create_internal_transfer`
- `odoo_find_internal_transfers`
- `odoo_get_transfer_summary`
- `odoo_prepare_internal_transfer`
- `odoo_prepare_transfer_validation`
- `odoo_validate_transfer`

## views (21 tools)

- `odoo_apply_report_patch_safe`
- `odoo_apply_view_patch_safe`
- `odoo_assist_report_migration`
- `odoo_assist_view_migration`
- `odoo_batch_assist_report_migration`
- `odoo_batch_assist_view_migration`
- `odoo_find_views_by_model`
- `odoo_get_report_template`
- `odoo_get_view_by_xmlid`
- `odoo_preview_report_patch`
- `odoo_preview_view_patch`
- `odoo_propose_report_patch`
- `odoo_propose_view_patch`
- `odoo_rollback_patch_safe`
- `odoo_scan_report_migration_issues`
- `odoo_scan_view_migration_issues`
- `odoo_test_view_compilation`
- `odoo_validate_report_patch`
- `odoo_validate_view_patch`
- `odoo_visualize_report_patch`
- `odoo_visualize_view_patch`

---

## Resources (5)

- `get_odoo18_fields_reference` → `'odoo://context/odoo18-fields-reference'`
- `get_odoo_models` → `'odoo://models'`
- `get_model_schema` → `'odoo://model/{model_name}/schema'`
- `get_resource_record_summary` → `'odoo://record/{model}/{id}/summary'`
- `get_resource_chatter_summary` → `'odoo://record/{model}/{id}/chatter_summary'`

---

## Full Reference (JSON)

```json
```