---
name: ocr-invoice
description: Extract supplier invoice data from Odoo attachment (PDF/image) using an OpenAI-compatible vision model and optionally create the vendor bill automatically in Odoo.
homepage: https://github.com/nicolasramos/odooclaw
metadata: {"openclaw":{"emoji":"🧾","requires":{"env":["ODOO_URL","ODOO_DB","ODOO_USERNAME","ODOO_PASSWORD","VISION_API_BASE","VISION_MODEL","OPENAI_API_KEY"]}}}
---

# OCR Invoice Skill

Complete vendor bill flow from an Odoo attachment:

1) Download `ir.attachment` (PDF or image)
2) Extract invoice data with a vision model (OpenAI-compatible API)
3) Normalize invoice JSON
4) Optionally create vendor bill (`account.move`, `in_invoice`) and attach original file

## When to use this skill

- When a user uploads an invoice (PDF/image) in Odoo chat.
- When `attachment_id` is available.

## Tools

### `ocr-invoice`

Extract invoice data without creating the vendor bill in Odoo.

```json
{
  "attachment_id": 1234,
  "sender_id": 7,
  "company_id": 3,
  "allowed_company_ids": [3, 5]
}
```

### `ocr-create-vendor-bill`

Extract and create vendor bill in Odoo.

```json
{
  "attachment_id": 1234,
  "dry_run": false,
  "sender_id": 7,
  "company_id": 3,
  "allowed_company_ids": [3, 5]
}
```

- `dry_run=true`: extract and normalize only; do not create `account.move`.
- `sender_id` + company context: executes ORM as the Odoo user and respects multi-company (`company_id`, `allowed_company_ids`).

## Environment variables

Required:

- `ODOO_URL`
- `ODOO_DB`
- `ODOO_USERNAME`
- `ODOO_PASSWORD`
- `VISION_API_BASE`
- `VISION_MODEL`
- `OPENAI_API_KEY`

Optional:

- `OCR_API_BASE` (if an external `/v1/ocr/invoice` endpoint exists)
- `OCR_TIMEOUT_SECONDS` (default: `240`)
- `OCR_MAX_PAGES` (default: `4`)
- `OCR_IMAGE_DPI` (default: `170`)

## Example configuration

```yaml
environment:
  - VISION_API_BASE=https://api.openai.com/v1
  - VISION_MODEL=gpt-4o-mini
  - OPENAI_API_KEY=sk-...
```

Also works with OpenAI-compatible endpoints (OVH, Groq, vLLM, etc.) that expose multimodal `chat/completions`.

## Expected output

```json
{
  "partner_name": "Proveedor SL",
  "partner_vat": "B12345678",
  "invoice_date": "2026-03-09",
  "invoice_date_due": "2026-04-09",
  "ref": "FRA-2026-001",
  "currency": "EUR",
  "amount_total": 121.0,
  "invoice_line_ids": [
    {
      "name": "Servicio",
      "quantity": 1,
      "price_unit": 100.0,
      "tax_percentage": 21
    }
  ]
}
```

## Implementation notes

- For PDF files, it converts pages to images with `pdftoppm`.
- If `OCR_API_BASE` is set, it tries that endpoint first.
- During vendor bill creation:
  - looks up partner by VAT, then by name;
  - creates partner if missing;
  - assigns a default expense account when possible;
  - maps taxes by percentage (`account.tax`, `purchase` type);
  - attaches the original PDF/image to the created bill.
