# OCR Vendor Bill and Expense Skill

This document describes the recommended OCR flows for supplier invoices and employee expense receipts in OdooClaw.

## Goal

Allow users to send a PDF/image invoice or receipt to the Odoo bot and create business records automatically.

## End-to-end flow

1. User uploads invoice in Odoo Discuss.
2. Agent receives `attachment_id`.
3. `ocr-invoice` skill downloads `ir.attachment` from Odoo.
4. Vision model extracts structured JSON.
5. `ocr-create-vendor-bill` creates `account.move` (`move_type=in_invoice`).
6. Original file is attached back to the created bill (`ir.attachment`).

## Employee expense flow

1. User uploads receipt in Odoo Discuss.
2. Agent receives `attachment_id`.
3. `ocr-create-employee-expense` extracts structured expense JSON.
4. Skill creates `hr.expense` for the sender employee (or explicit `employee_id`).
5. Original file is attached back to the created expense (`ir.attachment`).

## Mileage expense flow

1. User uploads a mileage receipt or trip document in Odoo Discuss.
2. Agent receives `attachment_id`.
3. `ocr-create-mileage-expense` extracts `trip_date`, `origin`, `destination`, `distance_km`, `rate_per_km`, and `total_amount`.
4. Skill creates `hr.expense` with mileage-friendly values (`quantity=distance_km`, `unit_amount=rate_per_km`) when available.
5. Original file is attached back to the created expense (`ir.attachment`).

## Why this implementation

- Provider-agnostic: uses OpenAI-compatible endpoint (`VISION_API_BASE`).
- No hard dependency on local MLX, Ollama, or specific hardware.
- Works with OpenAI, OVH, Groq, vLLM, and equivalent APIs.

## Required environment variables

- `ODOO_URL`
- `ODOO_DB`
- `ODOO_USERNAME`
- `ODOO_PASSWORD`
- `VISION_API_BASE`
- `VISION_MODEL`
- `OPENAI_API_KEY`

Optional:

- `OCR_API_BASE` for external OCR gateway exposing `/v1/ocr/invoice`
- `OCR_TIMEOUT_SECONDS`, `OCR_MAX_PAGES`, `OCR_IMAGE_DPI`

## Tools

- `ocr-invoice`: extraction only.
- `ocr-create-vendor-bill`: extraction + vendor bill creation.
- `ocr-create-employee-expense`: extraction + employee expense creation.
- `ocr-create-mileage-expense`: extraction + mileage expense creation.

## Security and repository hygiene

- Do not commit real API keys, private URLs, personal paths, or customer data.
- Keep examples with placeholders only (`sk-...`, `https://api.example.com/v1`).
- Validate `.env`, local overrides, and non-example config files before committing.
