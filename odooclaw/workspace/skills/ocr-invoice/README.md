# OdooClaw Invoice OCR Pipeline

Model-agnostic 4-layer invoice extraction for Odoo. Built for OdooClaw,
designed to work with **any** vision model and **any** LLM you already have —
local or cloud, as long as it speaks an OpenAI-compatible API.

## Architecture

```
PDF ──► Layer 1: TEXT LAYER / VISION ──► text ──► Layer 2: FISCAL BLOCK ──► JSON
              │ (text layer first; VLM fallback)        (deterministic, no model)
              ▼
         Layer 3: HEADER (any OpenAI-compatible LLM)
              ▼
         Layer 4: VALIDATION + Odoo rules
              ▼
         vendor bill JSON (account_dynamic_rules maps taxes/accounts)
```

### Layer 1 — Text layer first, vision fallback (model-agnostic)

Digital PDFs (Odoo exports, generated invoices) carry a **native text layer**
that is exact and free. The pipeline reads it first; the VLM is only invoked
when the text layer is empty (scanned PDFs) or has no usable total (layouts
where values precede labels). Hybrid mode feeds the fiscal block the
total-bearing text and the header block the exact text layer.

Any VLM that reads images through an OpenAI-compatible `chat/completions`
endpoint works as the vision fallback. The default is `odooclaw-vision`
(GLM-OCR, ~610 MB GGUF, runs on CPU). Swap it for PaddleOCR-VL, Qwen-VL,
GPT-4o or any other model by changing `OCRConfig.vision_*` — no code changes.

### Layer 2 — Fiscal block (deterministic, no model)

Semantic pattern matching over the OCR text. No layout assumptions, no
hardcoded tax positions:

- `Base: 100.00 - Tipo: 7% - IGIC: 7.00`
- `Base imponible 100.00 al 21%`
- `I.G.I.C. General (7%): 7.00` (per-rate quota lines)
- `IVA 21% 441.00` / `USt. 19% 247.10` / `Tax: 20% 990.00` (quota after
  rate → base derived as `quota * 100 / rate`)
- One line per tax rate (`Base al 7%`), totals via `Total`/`Subtotal` keywords
- Currency symbols (`$`, `€`, `£`, `USD`, `EUR`, `GBP`) tolerated in amounts
- Reverse charge / exempt invoices detected (`sujeto pasivo`, `exento`,
  `reverse charge`) → zero tax, still valid
- Spanish decimal separators handled (`1.013,45` → `1013.45`)
- No-tax invoices (subtotal == total) → `amount_tax = 0`, not "missing"

The layer does **not** decide which fiscal position applies — it reports
`tax_percentage` and lets Odoo (via `account_dynamic_rules`) map it to the
configured tax/fiscal position.

### Layer 3 — Header (model-agnostic)

Any OpenAI-compatible LLM extracts `partner_name`, `vat`, `ref`,
`invoice_date`, `currency` as JSON. Default is `LFM2.5-1.2B-Instruct` (base,
no fine-tune, ~630 MB MLX / Q4_K_M GGUF on CPU) — fast enough for CPU, clean
JSON output.

### Layer 4 — Validation + Odoo rules

Arithmetic sanity checks (sum of bases + tax = total, 1% relative tolerance
for rounding), partner `find_or_create` by VAT → name, and explicit
`validation_issues` for anything that cannot be trusted. Invoices that fail
validation are flagged for human review — **never** created with invented
data.

## Usage

```python
from pipeline import OCRConfig, run_pipeline

cfg = OCRConfig(
    # Layer 1 — your vision model (any OpenAI-compatible endpoint)
    vision_base_url="http://127.0.0.1:8093/v1",
    vision_model="odooclaw-vision",          # or paddleocr-vl, qwen-vl, gpt-4o...
    # Layer 3 — your LLM (any OpenAI-compatible endpoint)
    llm_base_url="http://127.0.0.1:8084/v1",
    llm_model="LFM2.5-1.2B-Instruct-base-Q4_K_M",
    llm_api_key="",
)

result = run_pipeline("invoice.pdf", cfg)
# result: partner_name, vat, ref, invoice_date, amount_total, amount_tax,
#         invoice_line_ids (one per tax rate), _ok, _issues, _source
```

## MCP integration (server.py)

`OCR_MODE=pipeline` selects the 4-layer pipeline inside the OCR MCP server:

```
OCR_MODE=pipeline
OCR_PIPELINE_VISION_URL=http://127.0.0.1:8093/v1
OCR_PIPELINE_VISION_MODEL=odooclaw-vision
OCR_PIPELINE_LLM_URL=http://127.0.0.1:8084/v1
OCR_PIPELINE_LLM_MODEL=LFM2.5-1.2B-Instruct-base-Q4_K_M
```

## Real-world validation

### Original dataset (2026-08, README v1)

Tested against 31 real supplier invoices (supplies, construction, public
administration): **15/31 fully validated** with GLM-OCR as vision (7/31 with
PaddleOCR-VL — measured, not assumed). Failures are flagged explicitly
(missing totals, reverse-charge without tax line) and go to human review.

### Production environment (2026-08-12, after extraction fixes)

Validated on the N100 gateway with the deployed stack
(odooclaw-vision :8093 + LFM2.5-1.2B-Instruct base :8084):

| Invoice | Source | total | tax | lines | _ok |
|---|---|---|---|---|---|
| Odoo demo 884 (Azure Interior, $30 USD) | hybrid | 30.0 | 0.0 | 1 | ✅ |
| Odoo demo 885 (Azure Interior Solutions, 541,10 €) | text-layer | 541.1 | 0.0 | 1 | ✅ |
| factura_ES_suministros (García S.L., 2541,00 €) | text-layer | 2541.0 | 441.0 | 1 | ✅ |
| factura_EN_globe_services (Globe Services, 5940,00 GBP) | text-layer | 5940.0 | 990.0 | 1 | ✅ |
| factura_DE_technik (Technik Müller, 1547,60 €) | text-layer | 1547.6 | 247.1 | 1 | ✅ |
| factura_FR_batiment (Durand SARL, 2928,00 €) | text-layer | 2928.0 | 488.0 | 1 | ✅ |

**6/6 fully validated** — both Odoo demo attachments created real
`account.move` records (ids 30/31, devel DB) with `amount_total > 0`, correct
partner, and no hallucinated tax. Every extracted field matched the source
PDF. The 15/31 original dataset is not present on the N100/NAS, so the
threshold was re-measured on the available real PDFs; failures continue to go
to declared human review.

## Design rules

- **Model-agnostic**: every model is a config value, never a code dependency
- **No hardcoded fiscal positions**: the pipeline reports rates; Odoo maps
- **No vendor data**: no company maps, no CIFs, no tax matrices in the code
- **Text layer first**: digital PDFs are read exactly, vision is the fallback
- **Honest failures**: unknown → flagged, never invented
