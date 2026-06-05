# Odoo MCP - Accounting Tools

Updated: 2026-06-05

This document describes the accounting-focused MCP tools added to `odoo-mcp`.

## Implemented Tools

### 1) `odoo_find_unreconciled_bank_lines`
- Purpose: list unreconciled bank statement lines.
- Input: `journal_id?`, `date_from?`, `date_to?`, `amount_min?`, `amount_max?`, `limit`.
- Output: `count`, `lines[]` with statement metadata.

### 2) `odoo_suggest_bank_reconciliation`
- Purpose: suggest candidate journal items for one bank line.
- Input: `statement_line_id`, `tolerance_amount`, `days_window`, `limit`.
- Output: ranked `suggestions[]` with `score`.

### 3) `odoo_reconcile_bank_line`
- Purpose: execute reconciliation for a bank line.
- Input: `statement_line_id`, `move_line_ids[]`, `confirm`.
- Guardrail: requires `confirm=true`.

### 4) `odoo_register_invoice_payment`
- Purpose: register payment through `account.payment.register` wizard.
- Input: `invoice_id`, `amount?`, `payment_date?`, `journal_id?`, `memo?`.
- Output: residual and payment-state before/after.

### 5) `odoo_get_ar_ap_aging`
- Purpose: AR/AP aging report by buckets.
- Input: `report_type` (`receivable|payable|both`), `as_of?`, `company_id?`, `limit`.
- Output: `totals` and detailed `invoices[]` with `overdue_days` and `bucket`.

### 6) `odoo_run_period_close_checks`
- Purpose: monthly close readiness checks.
- Input: `period_start`, `period_end`, `company_id?`.
- Output: `go_no_go`, `checks`, `critical`, `warnings`.

### 7) `odoo_create_journal_entry`
- Purpose: create balanced journal entries.
- Input: `journal_id`, `date`, `lines[]`, `ref?`, `company_id?`.
- Validation: rejects unbalanced entries (`sum(debit) != sum(credit)`).

### 8) `odoo_post_journal_entry`
- Purpose: post a draft journal entry.
- Input: `move_id`, `confirm`.
- Guardrail: requires `confirm=true`.

### 9) `odoo_get_tax_summary`
- Purpose: summarize tax amounts for a date range.
- Input: `date_from`, `date_to`, `company_id?`, `tax_group_id?`.
- Output: `taxes[]` and `total_tax`.

### 10) `odoo_validate_vendor_bill_duplicate`
- Purpose: duplicate-risk check for vendor bills.
- Input: `partner_id`, `vendor_bill_number?`, `invoice_date?`, `amount_total?`, `currency_id?`, `tolerance`.
- Output: `risk_level` and scored `candidates[]`.

### 11) `odoo_suggest_expense_account_and_taxes`
- Purpose: suggest accounting account and taxes from history/product defaults.
- Input: `description`, `amount`, `partner_id?`, `product_id?`, `company_id?`.
- Output: `suggested_account_id`, `suggested_tax_ids`, `confidence`.

### 12) `odoo_create_vendor_bill_from_ocr_validated`
- Purpose: create vendor bill from OCR payload with validation and guardrails.
- Input:
  - `ocr_payload` (required)
  - `attachment_id?`
  - `confirm`
  - `dry_run`
  - `company_id?`
  - `allowed_company_ids?`
  - `total_tolerance?`
  - `vendor_create_policy?` (`search_only|propose_create|create_with_confirm`)
  - `confirm_partner_create?`
- Behavior:
  - Resolves missing `partner_id` by vendor VAT, supplier reference or name.
  - If the vendor is not found, proposes a `suggested_partner` by default instead of silently creating it.
  - Creates a missing vendor only when `vendor_create_policy=create_with_confirm`, `confirm_partner_create=true`, `confirm=true` and `dry_run=false`.
  - Runs duplicate detection before create and blocks high-risk duplicates unless `confirm=true`.
  - Compares OCR total against calculated OCR line total and returns `total_mismatch` when outside tolerance.
  - Supports optional payment term, currency, fiscal position, due date and company fields when available in the target Odoo instance.
  - `dry_run=true` returns preview and generated `move_vals` only.

### 13) `odoo_create_vendor_invoice`
- Purpose: legacy compatibility tool for vendor invoices.
- Behavior: routed internally through `odoo_create_vendor_bill_from_ocr_validated` so it cannot bypass preview, duplicate checks or total validation.

## Purchase / Vendor Bill Matching Tools

### 14) `odoo_find_purchase_order`
- Purpose: find purchase orders by name, vendor, state and limit.
- Output: candidate purchase orders plus detected OCA purchase capabilities.

### 15) `odoo_get_purchase_order_summary`
- Purpose: summarize purchase order header and order lines.
- Output: PO metadata, line quantities/prices/taxes and optional OCA capability flags.

### 16) `odoo_get_purchase_receipt_status`
- Purpose: explain receiving state for a purchase order.
- Behavior: reads linked stock pickings when available, otherwise falls back to ordered vs received quantities on PO lines.

### 17) `odoo_get_purchase_invoice_status`
- Purpose: explain billing state for a purchase order.
- Output: invoice status, linked invoice IDs when available, uninvoiced amount when exposed, and line-level quantities to invoice.

### 18) `odoo_suggest_vendor_products`
- Purpose: suggest vendor products from `product.supplierinfo`.
- Compatibility: returns `unsupported` when supplierinfo is not available instead of inventing data.

### 19) `odoo_match_vendor_bill_to_purchase_order`
- Purpose: match an OCR/vendor bill payload against purchase order lines before draft bill creation.
- Input: `partner_id`, `vendor_bill_number?`, `purchase_order_id?`, `ocr_payload?`, `tolerance?`.
- Output: best PO candidate, line matches, quantity/price/tax discrepancies, receipt/invoice status and risk level.

## Safety and Compatibility Notes

- Sensitive operations (`reconcile`, `post`, OCR bill create, missing vendor creation) require explicit confirmation.
- Purchase matching tools are read/analysis tools; they do not publish, pay or reconcile documents.
- All operations run under sender user context (`sender_id`) to preserve ACL/record rules.
- Multi-company context is supported via `company_id` and `allowed_company_ids` where applicable.
- OCA alignment is capability-first: optional fields/models are detected and reported; missing OCA modules produce `unsupported` or safe fallback behavior.
