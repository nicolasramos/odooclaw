# Odoo MCP - View/Report Migration Tools (Fase 1 + Fase 2 + Fase 3 + Fase 4)

Updated: 2026-04-18

This document describes the secure migration tooling iterations in `odoo-mcp`.

## Scope

- Read metadata and XML of views/reports.
- Detect migration risks for Odoo 17/18.
- Propose non-destructive patches.
- Validate and preview patches before any apply phase.
- Perform compile checks in read/propose mode.

## Implemented Tools

### 1) `odoo_get_view_by_xmlid`
- Purpose: fetch one `ir.ui.view` by xmlid.
- Input: `xmlid`, `include_inherited_chain`.
- Output: `view` payload with `arch_db` and optional `inherited_chain`.

### 2) `odoo_find_views_by_model`
- Purpose: list views for one model.
- Input: `model`, `view_type?`, `limit`.
- Output: `count`, `views[]`.

### 3) `odoo_get_report_template`
- Purpose: resolve `ir.actions.report` and candidate QWeb templates.
- Input: `xmlid` of report action.
- Output: `report`, primary `template`, and `candidates[]`.

### 4) `odoo_scan_view_migration_issues`
- Purpose: detect migration issues in view XML.
- Input: `xmlid`, `target_version`, `rule_sets?`.
- Output: `issues[]` and severity `summary`.

### 5) `odoo_scan_report_migration_issues`
- Purpose: detect migration issues in report/QWeb templates.
- Input: `xmlid`, `target_version`, `rule_sets?`.
- Output: `issues[]` and severity `summary`.

### 6) `odoo_propose_view_patch`
- Purpose: generate advisory patch proposal from detected issues.
- Input: `xmlid`, `intent`, `constraints?`.
- Output: `proposal` with `operations`, optional `replacements`, and preview XML.

### 7) `odoo_propose_report_patch`
- Purpose: generate advisory patch proposal for reports/templates.
- Input: `xmlid`, `intent`, `constraints?`.
- Output: `proposal` with `operations`, optional `replacements`, and preview XML.

### 8) `odoo_validate_view_patch`
- Purpose: validate patch structure against base view XML.
- Input: `base_view_xmlid`, `patch`, `strict`, `target_version`.
- Output: `valid`, `checks`, `warnings`, `errors`.

### 9) `odoo_validate_report_patch`
- Purpose: validate patch structure against base report template XML.
- Input: `report_xmlid`, `patch`, `strict`, `target_version`.
- Output: `valid`, `checks`, `warnings`, `errors`.

### 10) `odoo_preview_view_patch`
- Purpose: preview before/after XML and generated diff.
- Input: `base_view_xmlid`, `patch`, `diff_format`.
- Output: `preview.before`, `preview.after`, `preview.diff`, `changed_nodes`.

### 11) `odoo_test_view_compilation`
- Purpose: best-effort compilation test for one view.
- Input: `view_xmlid`, `context?`.
- Output: `compiles`, `errors[]`.

## Fase 1 Guardrails

- Read/propose/validate/preview only.
- No persistent writes to `ir.ui.view` or report records.
- Audit events emitted for each operation category.
- Strict validation mode available for XPath ambiguity.

## Fase 2 Scope (apply_safe + rollback)

- Controlled apply using inherited views/templates only.
- Confirmation gate (`confirm=true`) required before persistent writes.
- Dry-run mode for apply and rollback (`dry_run=true`).
- Snapshot payload returned on apply for rollback orchestration.
- Rollback deactivates generated inherited views (non-destructive).

### 12) `odoo_apply_view_patch_safe`
- Purpose: create an inherited `ir.ui.view` extension from a validated `xml_inheritance` patch.
- Input: `base_view_xmlid`, `patch`, `strict`, `confirm`, `dry_run`, `inherited_view_name?`, `priority`.
- Output: `applied`, `created_view_id`, `snapshot`.

### 13) `odoo_apply_report_patch_safe`
- Purpose: create an inherited QWeb template extension for a report action.
- Input: `report_xmlid`, `patch`, `strict`, `confirm`, `dry_run`, `inherited_view_name?`, `priority`.
- Output: `applied`, `created_view_id`, `snapshot`.

### 14) `odoo_rollback_patch_safe`
- Purpose: rollback an apply-safe operation using the snapshot payload.
- Input: `snapshot`, `confirm`, `dry_run`.
- Output: `rolled_back`, `created_view_id`, `rollback_action`.

## Fase 2 Guardrails

- `apply_safe` only accepts `patch_format=xml_inheritance`.
- Base view/template overwrite is not performed.
- Validation failure blocks apply.
- Rollback avoids deletion; it deactivates created inherited views.
- Audit events emitted for apply dry-run/apply/rollback actions.

## Fase 3 Scope (assistant + PR-ready bundle)

- End-to-end orchestration for migration analysis.
- Consolidated output bundle with scan/proposal/validation/preview.
- Markdown report + checklist for PR workflows.
- Optional compile check for view assistant flow.

### 15) `odoo_preview_report_patch`
- Purpose: preview report/QWeb patch with before/after + diff.
- Input: `report_xmlid`, `patch`, `diff_format`.
- Output: `preview.before`, `preview.after`, `preview.diff`, `changed_nodes`.

### 16) `odoo_assist_view_migration`
- Purpose: run scan → propose → validate → preview (+ compile test) and return migration bundle.
- Input: `xmlid`, `target_version`, `intent`, `constraints?`, `strict`, `include_compile_test`.
- Output: orchestration artifacts and `pr_bundle` (markdown report + checklist).

### 17) `odoo_assist_report_migration`
- Purpose: run scan → propose → validate → preview for report templates and return migration bundle.
- Input: `xmlid`, `target_version`, `intent`, `constraints?`, `strict`.
- Output: orchestration artifacts and `pr_bundle` (markdown report + checklist).

## Fase 4 Scope (visual + batch automation)

- Visual migration preview with change counters and side-by-side excerpts.
- Batch assistant flows for view/report xmlids.
- Aggregated severity summary for migration waves.
- Continue-or-stop behavior configurable in batch mode.

### 18) `odoo_visualize_view_patch`
- Purpose: enrich view patch preview with visual summary (added/removed/changed lines).
- Input: `base_view_xmlid`, `patch`, `diff_format`.
- Output: `preview` + `visual` (line counters, excerpts, markdown summary).

### 19) `odoo_visualize_report_patch`
- Purpose: enrich report patch preview with visual summary.
- Input: `report_xmlid`, `patch`, `diff_format`.
- Output: `preview` + `visual` (line counters, excerpts, markdown summary).

### 20) `odoo_batch_assist_view_migration`
- Purpose: run `assist_view_migration` for multiple xmlids in one call.
- Input: `xmlids[]`, `target_version`, `intent`, `constraints?`, `strict`, `include_compile_test`, `continue_on_error`.
- Output: aggregate `summary`, per-item `results[]`, and `failures[]`.

### 21) `odoo_batch_assist_report_migration`
- Purpose: run `assist_report_migration` for multiple report xmlids.
- Input: `xmlids[]`, `target_version`, `intent`, `constraints?`, `strict`, `continue_on_error`.
- Output: aggregate `summary`, per-item `results[]`, and `failures[]`.

## Known Limitations (current iteration)

- XPath validation uses `xml.etree.ElementTree` support (advanced XPath variants may be reported as unsupported).
- Proposal format is advisory (safe by design) and intentionally non-applying.
- Compilation check depends on backend availability of `fields_view_get` and model-specific constraints.
- `apply_safe` currently targets `xml_inheritance` patches only (advisory patches must be converted first).
- Snapshot persistence is caller-managed (snapshot is returned in tool response).
- Visual summary is text/diff based; it is not a browser-rendered UI preview.
- Batch tools orchestrate analysis/proposal/validation; they do not mass-apply patches.

## Example (proposal + preview)

```json
{
  "xmlid": "sale.view_order_tree",
  "intent": "migrate_to_18",
  "constraints": {
    "deny_base_overwrite": true
  }
}
```

Expected proposal includes `TREE_TO_LIST` replacement hints and preview XML using `<list>`.
