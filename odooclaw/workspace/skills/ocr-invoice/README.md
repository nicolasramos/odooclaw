# OdooClaw Invoice OCR Pipeline

Model-agnostic 4-layer invoice extraction for Odoo. Built for OdooClaw,
designed to work with **any** vision model and **any** LLM you already have —
local or cloud, as long as it speaks an OpenAI-compatible API.

## Architecture

```
PDF ──► Layer 1: VISION ──► text ──► Layer 2: FISCAL BLOCK ──► JSON
              │                              (deterministic, no model)
              │ (any OpenAI-compatible VLM)
              ▼
         Layer 3: HEADER (any OpenAI-compatible LLM)
              ▼
         Layer 4: VALIDATION + Odoo rules
              ▼
         vendor bill JSON (account_dynamic_rules maps taxes/accounts)
```

### Layer 1 — Vision (model-agnostic)

Any VLM that reads images through an OpenAI-compatible `chat/completions`
endpoint. The default is `odooclaw-vision` (GLM-OCR, ~610 MB GGUF, runs on CPU).
Swap it for PaddleOCR-VL, Qwen-VL, GPT-4o or any other model by changing
`OCRConfig.vision_*` — no code changes.

### Layer 2 — Fiscal block (deterministic, no model)

Semantic pattern matching over the OCR text. No layout assumptions, no
hardcoded tax positions:

- `Base: 100.00 - Tipo: 7% - IGIC: 7.00`
- `Base imponible 100.00 al 21%`
- `I.G.I.C. General (7%): 7.00` (per-rate quota lines)
- One line per tax rate (`Base al 7%`), totals via `Total`/`Subtotal` keywords
- Reverse charge / exempt invoices detected (`sujeto pasivo`, `exento`,
  `reverse charge`) → zero tax, still valid
- Spanish decimal separators handled (`1.013,45` → `1013.45`)

The layer does **not** decide which fiscal position applies — it reports
`tax_percentage` and lets Odoo (via `account_dynamic_rules`) map it to the
configured tax/fiscal position.

### Layer 3 — Header (model-agnostic)

Any OpenAI-compatible LLM extracts `partner_name`, `vat`, `ref`,
`invoice_date`, `currency` as JSON. Default is `LFM2.5-1.2B-Instruct` (base,
no fine-tune, ~630 MB MLX) — fast enough for CPU, clean JSON output.

### Layer 4 — Validation + Odoo rules

Arithmetic sanity checks (sum of bases + tax = total), partner
`find_or_create` by VAT → name, and explicit `validation_issues` for
anything that cannot be trusted. Invoices that fail validation are flagged
for human review — **never** created with invented data.

## Usage

```python
from pipeline import OCRConfig, run_pipeline

cfg = OCRConfig(
    # Layer 1 — your vision model (any OpenAI-compatible endpoint)
    vision_base_url="http://192.168.1.14:8093/v1",
    vision_model="odooclaw-vision",          # or paddleocr-vl, qwen-vl, gpt-4o...
    # Layer 3 — your LLM (any OpenAI-compatible endpoint)
    llm_base_url="http://192.168.1.23:8000/v1",
    llm_model="LFM2.5-1.2B-Instruct-MLX-4bit",
    llm_api_key="",
)

result = run_pipeline("invoice.pdf", cfg)
# result: partner_name, vat, ref, invoice_date, amount_total, amount_tax,
#         invoice_line_ids (one per tax rate), _ok, _issues
```

## MCP integration (server.py)

`OCR_MODE=pipeline` selects the 4-layer pipeline inside the OCR MCP server:

```
OCR_MODE=pipeline
OCR_PIPELINE_VISION_URL=http://192.168.1.14:8093/v1
OCR_PIPELINE_VISION_MODEL=odooclaw-vision
OCR_PIPELINE_LLM_URL=http://192.168.1.23:8000/v1
OCR_PIPELINE_LLM_MODEL=LFM2.5-1.2B-Instruct-MLX-4bit
```

## Real-world validation

Tested against 31 real supplier invoices (supplies, construction, public
administration): **15/31 fully validated** with GLM-OCR as vision (7/31 with
PaddleOCR-VL — measured, not assumed). Failures are flagged explicitly
(missing totals, reverse-charge without tax line) and go to human review.

## Design rules

- **Model-agnostic**: every model is a config value, never a code dependency
- **No hardcoded fiscal positions**: the pipeline reports rates; Odoo maps
- **No vendor data**: no company maps, no CIFs, no tax matrices in the code
- **Honest failures**: unknown → flagged, never invented
