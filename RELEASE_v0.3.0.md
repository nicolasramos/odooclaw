# OdooClaw v0.3.0

## Summary

This release expands OdooClaw from general Odoo assistance into safer day-to-day business operations for purchases, vendor bills, products, inventory, and warehouse workflows.

It also hardens delegated permissions so OdooClaw executes MCP operations under the authenticated Odoo user's native access rights, record rules, and company context.

## Highlights

- Reinforced purchase and vendor-bill workflows:
  - OCR-validated vendor bills with duplicate and total checks.
  - Missing-vendor lookup, proposal, and confirmed creation.
  - Purchase-order, receipt, and vendor-bill matching.
  - Capability-first support for optional OCA purchase fields.
- Product and inventory operations:
  - Product, supplier, stock, location, move, and forecast visibility.
  - Receipt, delivery, and internal-transfer summaries and validation.
  - Safe internal-transfer creation.
  - Delivery-to-sale-order matching and backorder-risk detection.
  - Lot and serial traceability.
  - Reordering rules and replenishment suggestions.
  - Inventory discrepancy detection and controlled adjustments.
- Security hardening:
  - Delegated Odoo ACL, record-rule, active-user, and company enforcement.
  - Least-privilege technical-user documentation.
  - Preview, dry-run, explicit confirmation, and audit-friendly responses for persistent stock operations.
- Optional OCA logistics capability map without mandatory OCA dependencies.
- Firefox Add-ons and Chrome Web Store distribution links.
- Engram Docker/Doodba deployment documentation.

## Safety model

- Read-only and advisory tools never perform writes.
- Persistent stock operations require `confirm=true` and `dry_run=false`.
- Odoo backorder and immediate-transfer wizards are returned as `action_required` and are never processed automatically.
- All ORM operations propagate the delegated Odoo user context.

## Validation

- Odoo MCP main suite: `114 passed`.
- Odoo MCP Doodba 18 suite: `101 passed`.
- Real Doodba 18 validation covered:
  - Authorized and restricted delegated users.
  - Purchase and stock reads.
  - Delivery matching with low, medium, and high risk results.
  - Lot/serial search and traceability.
  - Reordering rules and replenishment advisory.
  - Inventory-adjustment preview, dry-run, and confirmation guards.
- No build was performed during release preparation.

## Issues

- Completes: https://github.com/nicolasramos/odooclaw/issues/12
- Continues roadmap planning in:
  - https://github.com/nicolasramos/odooclaw/issues/10
  - https://github.com/nicolasramos/odooclaw/issues/11
  - https://github.com/nicolasramos/odooclaw/issues/13
  - https://github.com/nicolasramos/odooclaw/issues/14
