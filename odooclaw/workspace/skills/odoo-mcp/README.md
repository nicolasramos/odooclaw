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

### 3) Integración de identidad de chat Odoo
- Se corrigió la inyección automática de contexto para el alias de servidor `odoo-mcp` (además de `odoo-manager`).
- Esto garantiza que `sender_id`, `company_id` y `allowed_company_ids` se propaguen correctamente en llamadas MCP desde Odoo Discuss.

### 4) Endurecimiento de acceso para Workforce
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
- `docs/odoo-view-report-migration-tools.md`
- `docs/ocr-vendor-bill-skill.md`
- `docs/odoo-private-reply-routing.md`
