---
name: ocr-invoice
description: Extract supplier invoice data from Odoo attachment (PDF/image) using an OpenAI-compatible vision model and optionally create the vendor bill automatically in Odoo.

metadata: {"openclaw": {"emoji": "🧾", "requires": {"env": ["ODOO_URL", "ODOO_DB", "ODOO_USERNAME", "ODOO_PASSWORD", "VISION_API_BASE", "VISION_MODEL", "OPENAI_API_KEY"]}}, "homepage": "https://github.com/nicolasramos/odooclaw"}
---

# OCR Invoice Skill

Complete vendor bill flow from an Odoo attachment:

1) Download `ir.attachment` (PDF or image)
2) Extract invoice data with a vision model (OpenAI-compatible API)
3) Normalize invoice JSON
4) Optionally create vendor bill (`account.move`, `in_invoice`) and attach original file
5) Optionally create employee expense (`hr.expense`) and attach original file
6) Optionally create mileage expense (`hr.expense`) and attach original file

## When to use this skill

- When a user uploads an invoice (PDF/image) in Odoo chat.
- When `attachment_id` is available.

## Tools

### `read_document`

Read an attached document and get its text back. When the document is an
invoice the answer also carries the structured fields and the validation
issues. This is the entry point for "what does this document say?" questions:
it downloads the `ir.attachment`, writes a scratch file, reads the PDF text
layer (or OCRs the rendered pages), runs the 4-layer pipeline and deletes the
scratch file, all in one call.

```json
{
  "attachment_id": 1234,
  "max_pages": 4,
  "include_text": true,
  "sender_id": 7,
  "company_id": 3,
  "allowed_company_ids": [3, 5]
}
```

- `max_pages`: PDF pages to read (default `OCR_MAX_PAGES`, capped at 20).
- `include_text=false`: return the structured fields without the whole text.
- Works on PDFs, images and plain text. Audio goes to `whisper-stt`, not here.
- `review_required` is true when the numbers did not validate: the text is
  still returned, the amounts are not to be trusted.

```json
{
  "success": true,
  "attachment_id": 1234,
  "filename": "factura.pdf",
  "text_source": "pdf_text_layer",
  "text_chars": 812,
  "partner_name": "Proveedor SL",
  "invoice_number": "FRA-2026-001",
  "amount_total": 121.0,
  "amount_tax": 21.0,
  "lines": [{"name": "Base al 21%", "price_subtotal": 100.0, "tax_percentage": 21.0}],
  "is_invoice": true,
  "validation_ok": true,
  "review_required": false,
  "text": "..."
}
```

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

### `ocr-create-employee-expense`

Extract and create employee expense in Odoo.

```json
{
  "attachment_id": 1234,
  "dry_run": false,
  "sender_id": 7,
  "company_id": 3,
  "allowed_company_ids": [3, 5],
  "employee_id": 12,
  "product_id": 345
}
```

- `dry_run=true`: extract and normalize only; do not create `hr.expense`.
- `employee_id` and `product_id` are optional overrides.
- If `employee_id` is omitted, the skill resolves employee from `sender_id`.

### `ocr-create-mileage-expense`

Extract and create mileage expense in Odoo.

```json
{
  "attachment_id": 1234,
  "dry_run": false,
  "sender_id": 7,
  "company_id": 3,
  "allowed_company_ids": [3, 5],
  "employee_id": 12,
  "product_id": 345
}
```

- `dry_run=true`: extract and normalize mileage data only.
- Extracted fields include `trip_date`, `origin`, `destination`, `distance_km`, `rate_per_km`, and `total_amount`.
- If `distance_km` and `rate_per_km` are detected, the expense uses them as `quantity` and `unit_amount`.

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
- `OCR_READ_TIMEOUT_SECONDS` (default: `120`): budget for one `read_document` call
- `OCR_READ_WORKDIR`: parent directory for the scratch file (default: system temp)
- `OCR_PIPELINE_VISION_URL` / `OCR_PIPELINE_VISION_MODEL` / `OCR_PIPELINE_VISION_KEY`:
  vision endpoint used to OCR scanned pages, falling back to `VISION_API_BASE` /
  `VISION_MODEL` / `OPENAI_API_KEY`
- `OCR_PIPELINE_LLM_URL` / `OCR_PIPELINE_LLM_MODEL` / `OCR_PIPELINE_LLM_KEY`:
  header model for the 4-layer pipeline

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
