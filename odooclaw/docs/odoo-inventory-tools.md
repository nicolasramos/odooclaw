# Odoo MCP - Product and Inventory Tools

Updated: 2026-06-05

This document describes the first read-only product and inventory MCP tools.

## Scope

This slice gives OdooClaw visibility before it performs warehouse actions:

- product search and product summaries,
- supplier information for products,
- stock availability from product fields and stock quants,
- stock locations,
- location stock summaries,
- stock moves,
- forecast explanation.

Persistent warehouse operations such as validating receipts, validating deliveries, creating inventory adjustments or confirming transfers are intentionally out of scope for this slice.

## Implemented Tools

### `odoo_find_product`

Find products by:

- `name?`
- `default_code?`
- `barcode?`
- `category_id?`
- `vendor_id?`
- `limit?`

Returns matching `product.product` records and detected stock capabilities.

### `odoo_get_product_summary`

Returns a business summary for one product:

- product metadata,
- sale/purchase flags,
- category/UoM/pricing fields when available,
- supplier information when `product.supplierinfo` is available,
- stock context.

### `odoo_get_product_supplier_info`

Returns supplierinfo rows for a product, optionally filtered by vendor.

Returns `unsupported` when `product.supplierinfo` is not available.

### `odoo_get_product_stock_context`

Explains stock for one product using:

- product-level fields such as `qty_available`, `virtual_available`, `incoming_qty`, `outgoing_qty`, `free_qty` when available,
- `stock.quant` rows when available,
- aggregate quant totals.

### `odoo_get_stock_availability`

Batch wrapper around product stock context for multiple products.

### `odoo_find_stock_locations`

Finds stock locations by name and/or usage.

Examples of usage values:

- `internal`
- `supplier`
- `customer`
- `transit`
- `inventory`
- `production`

### `odoo_get_location_stock_summary`

Aggregates quants in a location by product.

Useful for warehouse checks and inventory discrepancy analysis.

### `odoo_get_stock_moves`

Finds stock moves by:

- `product_id?`
- `picking_id?`
- `state?`
- `date_from?`
- `date_to?`
- `limit?`

### `odoo_explain_stock_forecast`

Combines product stock context with incoming/outgoing move context and warnings.

## Safety Notes

- These tools are read-only/advisory.
- No receipt, delivery, transfer or inventory adjustment is validated by this slice.
- Future write-capable stock tools must keep `dry_run`/preview and `confirm=true` guardrails.
- All calls run under the sender user context to preserve Odoo ACLs and record rules.

## Compatibility Notes

The implementation is capability-first:

- optional models return `unsupported`,
- optional fields are included only when they exist,
- Odoo version/module differences are represented in `stock_capabilities`.

## Purchase Receipt Tools

### `odoo_find_purchase_receipts`

Find incoming `stock.picking` receipts by purchase order, vendor, state or scheduled date.

## Sale Delivery Tools

- `odoo_find_sale_deliveries`
- `odoo_get_delivery_summary`
- `odoo_prepare_delivery_validation`
- `odoo_validate_delivery`

Delivery summaries detect over-delivery and missing lot/serial tracking. Validation
requires `confirm=true` and `dry_run=false`. Backorder and immediate-transfer
wizards return `action_required` and are never processed automatically.

## Internal Transfer Tools

- `odoo_find_internal_transfers`
- `odoo_get_transfer_summary`
- `odoo_prepare_transfer_validation`
- `odoo_validate_transfer`
- `odoo_prepare_internal_transfer`
- `odoo_create_internal_transfer`

Internal-transfer validation blocks identical source/destination locations,
over-transfers, missing tracking and invalid states. It uses the same explicit
preview and confirmation guardrails as receipts and deliveries.

Internal-transfer creation is prepared as one atomic `stock.picking.create`
payload containing its move lines. Creation requires `confirm=true` and
`dry_run=false`; invalid locations, products, quantities or unresolved internal
operation types block creation.

### `odoo_get_receipt_summary`

Returns:

- incoming picking metadata,
- demanded, received and remaining quantities,
- move lines,
- product tracking requirements,
- missing lot/serial discrepancies,
- over-receipt discrepancies.

### `odoo_match_receipt_to_purchase_order`

Matches receipt moves to purchase order lines and reports products that cannot be linked to the purchase order.

### `odoo_prepare_receipt_validation`

Builds a read-only validation plan with:

- `can_validate`,
- critical blockers,
- warnings,
- line/totals preview,
- required confirmation flags.

It blocks receipts that are already done/cancelled, over-received or missing required lot/serial information.

### `odoo_validate_receipt`

Validates an incoming receipt only when:

```json
{
  "confirm": true,
  "dry_run": false
}
```

If Odoo returns an additional wizard/action, such as a backorder confirmation, the tool returns `status=action_required`. It does not process that wizard automatically.
