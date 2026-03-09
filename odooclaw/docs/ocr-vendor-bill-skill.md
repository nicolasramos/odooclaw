# OCR Vendor Bill Skill

This document describes the recommended OCR flow for supplier invoices in OdooClaw.

## Goal

Allow users to send a PDF/image invoice to the Odoo bot and create a vendor bill automatically.

## End-to-end flow

1. User uploads invoice in Odoo Discuss.
2. Agent receives `attachment_id`.
3. `ocr-invoice` skill downloads `ir.attachment` from Odoo.
4. Vision model extracts structured JSON.
5. `ocr-create-vendor-bill` creates `account.move` (`move_type=in_invoice`).
6. Original file is attached back to the created bill (`ir.attachment`).

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

## Security and repository hygiene

- Do not commit real API keys, private URLs, personal paths, or customer data.
- Keep examples with placeholders only (`sk-...`, `https://api.example.com/v1`).
- Validate `.env`, local overrides, and non-example config files before committing.
