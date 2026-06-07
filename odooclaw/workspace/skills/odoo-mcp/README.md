# Odoo MCP Server

Un Servidor MCP modular, tipado y seguro para interactuar con el ORM de Odoo 18, diseñado bajo los principios de Desarrollo Guiado por Pruebas (TDD) y Delegación de Permisos Nativos.

## Overview
Reemplaza el antiguo enfoque monolítico con tools granulares (búsqueda, lectura, escritura con denylist estricta, acciones seguras).
Las operaciones Odoo se ejecutan bajo el contexto de seguridad nativo del identificador de usuario invocante, previniendo cualquier escalada de privilegios accidental.

## Novedades principales

### 1) Workforce / RRHH y tareas
- `odoo_find_attendance`
- `odoo_log_task_timesheet`
- `odoo_find_my_tasks`
- `odoo_update_task_status`
- `odoo_check_in` / `odoo_check_out`
- `odoo_get_my_today_summary`
- `odoo_find_missing_timesheets`
- `odoo_suggest_timesheet_from_attendance`
- `odoo_create_expense_report` / `odoo_submit_expense_report`
- `odoo_approve_expense`
- `odoo_notify_pending_actions`

### 2) Accounting
- `odoo_find_unreconciled_bank_lines`
- `odoo_suggest_bank_reconciliation`
- `odoo_reconcile_bank_line`
- `odoo_register_invoice_payment`
- `odoo_get_ar_ap_aging`
- `odoo_run_period_close_checks`
- `odoo_create_journal_entry` / `odoo_post_journal_entry`
- `odoo_get_tax_summary`
- `odoo_validate_vendor_bill_duplicate`
- `odoo_suggest_expense_account_and_taxes`
- `odoo_create_vendor_bill_from_ocr_validated`
  - resolves existing vendors, proposes missing vendor creation, and only creates a vendor with explicit partner + bill confirmation
- `odoo_create_vendor_invoice` (legacy, routed through the validated vendor bill flow)

### 3) Products + Inventory
- `odoo_find_product`
- `odoo_get_product_summary`
- `odoo_get_product_supplier_info`
- `odoo_get_product_stock_context`
- `odoo_get_stock_availability`
- `odoo_get_logistics_capabilities`
- `odoo_find_reordering_rules`
- `odoo_get_replenishment_suggestions`
- `odoo_find_inventory_discrepancies`
- `odoo_prepare_inventory_adjustment`
- `odoo_apply_inventory_adjustment`
- `odoo_find_stock_locations`
- `odoo_get_location_stock_summary`
- `odoo_get_stock_moves`
- `odoo_explain_stock_forecast`
- `odoo_find_purchase_receipts`
- `odoo_get_receipt_summary`
- `odoo_match_receipt_to_purchase_order`
- `odoo_prepare_receipt_validation`
- `odoo_validate_receipt`
- `odoo_find_sale_deliveries`
- `odoo_get_delivery_summary`
- `odoo_match_delivery_to_sale_order`
- `odoo_prepare_delivery_validation`
- `odoo_validate_delivery`
- `odoo_find_internal_transfers`
- `odoo_get_transfer_summary`
- `odoo_prepare_transfer_validation`
- `odoo_validate_transfer`
- `odoo_prepare_internal_transfer`
- `odoo_create_internal_transfer`
- `odoo_find_lot_serial`
- `odoo_get_lot_traceability`
- `odoo_check_lot_requirements`

Product/stock visibility tools are read-only/advisory. Receipt, delivery and internal-transfer validation require preview and explicit confirmation, and additional Odoo backorder/immediate-transfer wizards are never processed automatically.

### 4) Purchases + Vendor Bills
- `odoo_find_purchase_order`
- `odoo_get_purchase_order_summary`
- `odoo_get_purchase_receipt_status`
- `odoo_get_purchase_invoice_status`
- `odoo_suggest_vendor_products`
- `odoo_match_vendor_bill_to_purchase_order`

These tools are capability-first for Odoo/OCA: optional purchase workflow fields and models are detected at runtime and missing capabilities return `unsupported` or a safe fallback instead of assuming a module is installed.

### 5) Integración de identidad de chat Odoo
- Se corrigió la inyección automática de contexto para el alias de servidor `odoo-mcp` (además de `odoo-manager`).
- Esto garantiza que `sender_id`, `company_id` y `allowed_company_ids` se propaguen correctamente en llamadas MCP desde Odoo Discuss.
- El contexto confiable de Odoo sobrescribe cualquier identidad propuesta por el modelo.
- Los canales externos no pueden inyectar un `sender_id` de Odoo. Hasta disponer de un mapeo explícito de identidades, ejecutan con la cuenta técnica configurada.
- La cuenta técnica usada por canales externos debe aplicar mínimo privilegio; no se recomienda utilizar una cuenta administradora en producción.
- Todas las llamadas ORM internas propagan `sender_id`; una prueba estructural impide incorporar nuevas tools que omitan esta delegación.

### 6) Endurecimiento de acceso para Workforce
- Se amplió la allowlist de modelos para cubrir flujos de RRHH y gastos:
  - `hr.employee`
  - `hr.attendance`
  - `account.analytic.line`
  - `hr.expense`
  - `hr.expense.sheet`
- Se mejoró la discoverability de tools con descripciones explícitas en:
  - `odoo_check_in`
  - `odoo_check_out`

## Architecture
- **Core Layer**: Administra la sesión RPC, cookies y cliente Odoo (`call_kw`, `call_kw_as_user`).
- **MCP Resources Layer**: Expone metadatos persistentes al LLM (`schema`, `context`, `models`).
- **Tools Layer**: Funciones modulares puras estrictamente segmentadas (Introspección, Genéricas de CRUD y Negocio).
- **Security Layer**: Obliga el uso de Allowlists (para modelos), Denylists (protección estructural de registros) y validación de borrado.

## Configuration
Requires environment variables:
`ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_PASSWORD`

## Documentación relacionada
- `docs/odoo-workforce-tools.md`
- `docs/odoo-accounting-tools.md`
- `docs/odoo-inventory-tools.md`
- `docs/odoo-view-report-migration-tools.md`
- `docs/ocr-vendor-bill-skill.md`
- `docs/odoo-private-reply-routing.md`
