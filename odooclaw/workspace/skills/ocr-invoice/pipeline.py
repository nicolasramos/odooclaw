"""
OdooClaw Invoice Pipeline — 4-layer, MODEL-AGNOSTIC document extraction.

Architecture:
  Layer 1: VISION (any OpenAI-compatible VLM/OCR endpoint)
           -> structured text
  Layer 2: FISCAL BLOCK (deterministic semantic patterns, NO model)
           -> tax bases per rate + totals
  Layer 3: HEADER (any OpenAI-compatible LLM endpoint)
           -> partner, date, ref (interpretation, not layout)
  Layer 4: VALIDATION + Odoo rules
           -> arithmetic sanity checks, partner find_or_create

Every model is swappable via OCRConfig: users can plug their own
vision model and their own LLM (local or cloud). Defaults point to
the OdooClaw stack (odooclaw-vision + LFM2.5-1.2B).
"""

import base64
import json
import re
import urllib.request
from dataclasses import dataclass, field


# --------------------------------------------------------------------------
# Configuration — THE agnostic part. Any OpenAI-compatible endpoint works.
# --------------------------------------------------------------------------
@dataclass
class OCRConfig:
    # Layer 1: vision / OCR endpoint (VLM, OpenAI-compatible chat/completions)
    # Default: odooclaw-vision (GLM-OCR) — 15/31 in real battery vs 7/31 Paddle.
    # Swap to any VLM: PaddleOCR-VL, Qwen-VL, GPT-4o, etc.
    vision_base_url: str = "http://127.0.0.1:8093/v1"      # odooclaw-vision (GLM-OCR)
    vision_model: str = "odooclaw-vision"
    vision_api_key: str = ""

    # Layer 3: LLM endpoint for header interpretation
    llm_base_url: str = "http://127.0.0.1:8000/v1"         # oMLX Mac Studio
    llm_model: str = "LFM2.5-1.2B-Instruct-MLX-4bit"          # base, no fine-tune
    llm_api_key: str = ""

    # OCR quality
    dpi: int = 96
    max_pages: int = 4
    ocr_timeout: int = 1500
    llm_timeout: int = 240


def _chat(base_url, model, api_key, messages, max_tokens, timeout):
    """Generic OpenAI-compatible chat call (used by layers 1 and 3)."""
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0,
        "max_tokens": max_tokens,
    }
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    req = urllib.request.Request(
        base_url.rstrip("/") + "/chat/completions",
        data=json.dumps(payload).encode(),
        headers=headers,
    )
    r = urllib.request.urlopen(req, timeout=timeout)
    return json.loads(r.read())["choices"][0]["message"]["content"]


# --------------------------------------------------------------------------
# Layer 1 — Vision. MODEL-AGNOSTIC: any VLM that reads images.
# --------------------------------------------------------------------------
def pdf_to_images(pdf_path, dpi=96, max_pages=4):
    import fitz  # PyMuPDF
    doc = fitz.open(pdf_path)
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pages = []
    for i, page in enumerate(doc):
        if i >= max_pages:
            break
        pages.append(page.get_pixmap(matrix=mat).tobytes("png"))
    doc.close()
    return pages


VISION_PROMPT = (
    "Extract all structured fields from this invoice document. "
    "Output every field as a labeled line in the exact format 'Field: value', one per line. "
    "Include the supplier name, tax id (CIF/NIF), invoice number, date, and EVERY line item "
    "with quantity, unit price, discount, tax rate and amount. "
    "Include the tax summary lines exactly like 'Base: X - Tipo: Y - IGIC/IVA: Z' and "
    "'Subtotal: X', 'Total: X'. Preserve Spanish decimal separators as printed."
)


def layer1_vision(cfg: OCRConfig, image_bytes) -> str:
    """Image -> structured text. Swap cfg.vision_* to use any VLM."""
    b64 = base64.b64encode(image_bytes).decode()
    messages = [{"role": "user", "content": [
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
        {"type": "text", "text": VISION_PROMPT},
    ]}]
    return _chat(cfg.vision_base_url, cfg.vision_model, cfg.vision_api_key,
                 messages, max_tokens=2048, timeout=cfg.ocr_timeout)


# --------------------------------------------------------------------------
# Layer 2 — Fiscal block. DETERMINISTIC, MODEL-FREE, LAYOUT-INDEPENDENT.
# Works on any structured text from any vision model. No hardcoded tax
# positions: it recognizes rates (numbers followed by %) and tax summaries
# (Base/IGIC/IVA/IRPF keywords) wherever they appear.
# --------------------------------------------------------------------------
def _norm_number(s):
    """Spanish/European number normalization: '1.013,45' -> 1013.45."""
    s = s.strip().replace(" ", "").replace("\u00a0", "")
    if not s or not re.search(r"\d", s):
        return None
    s = s.replace("€", "").replace("EUR", "").replace("$", "").replace("£", "").replace("USD", "").replace("GBP", "").strip()
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):   # 1.013,45 -> thousands dot, decimal comma
            s = s.replace(".", "").replace(",", ".")
        else:                              # 1,013.45 -> US format
            s = s.replace(",", "")
    elif "," in s:                          # 22,52 -> 22.52
        s = s.replace(",", ".")
    try:
        return round(float(s), 4)
    except ValueError:
        return None


def _detect_reverse_charge(text):
    """Detect reverse charge / subject-passive / exempt invoices (no tax due)."""
    patterns = [
        r"reverse\s*charge",
        r"inversi[oó]n\s+del\s+sujeto\s+pasivo",
        r"inversi[oó]n\s+sujeto\s+pasivo",
        r"sujeto\s+pasivo",
        r"impuesto\s+devengado\s+por\s+el\s+adquiriente",
        r"intracomunitari[oa].*exent",
        r"exent[oa]?\s+de\s+(?:iva|igic)",
        r"(?:iva|igic)\s+exent[oa]?",
        r"sin\s+(?:iva|igic)",
        r"operaci[oó]n\s+exent[oa]?",
    ]
    for p in patterns:
        if re.search(p, text, re.IGNORECASE):
            return True
    return False


def _parse_fiscal(text):
    """Extract (base, rate) pairs from tax summary lines.

    Recognized shapes (semantic, not positional):
      'Base: 100.00 - Tipo: 7% - IGIC: 7.00'
      'Base imponible 100.00 al 21%'
      'Base al 7%: 100.00'
      'Base: 100.00  Tipo: 21%  Cuota: 21.00'
      '7% : 100.00'
      'IVA 21% 441.00' / 'USt. 19% 247.10' / 'Tax: 20% 990.00'  (quota after rate)
    """
    pairs = []  # (rate_percent, base_amount)
    num = r"\d[\d.,\s]*\d|\d"

    # Shape 5 runs FIRST: quota-after-rate summary lines — 'IVA 21% 441.00',
    # 'USt. 19% 247.10', 'Tax: 20% 990.00', 'TVA 20% 488.00'. The number AFTER
    # the % is the QUOTA; derive base = quota * 100 / rate. The matched spans
    # are masked so Shape 3/4 cannot double-count the same summary line.
    quota_spans = []
    for m in re.finditer(
        rf"(?:iva|igic|tva|ust|vat|tax|steuer|impuesto|cuota|mehrwertsteuer|m\s?w\s?st)[\s:.]*"
        rf"(\d+(?:[.,]\d+)?)\s*%\s*[:=]?\s*({num})\b",
        text, re.IGNORECASE,
    ):
        rate = _norm_number(m.group(1))
        quota = _norm_number(m.group(2))
        if quota is not None and rate is not None and 0 < rate <= 100 and quota > 0:
            base = round(quota * 100.0 / rate, 2)
            if base > 0:
                pairs.append((rate, base))
                quota_spans.append(m.span())

    masked = text
    if quota_spans:
        masked = list(text)
        for s, e in quota_spans:
            for i in range(s, e):
                masked[i] = " "
        masked = "".join(masked)

    # Shape 1: Base/Subtotal ... (Tipo|al) ... N%  — PaddleOCR output omits '%' after rate
    for m in re.finditer(
        rf"(?:base|subtotal)\s*(?:imponible)?\s*[:=]?\s*({num})\s*"
        rf"(?:-|,|;)?\s*(?:tipo|al|a)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%?",
        masked, re.IGNORECASE,
    ):
        base = _norm_number(m.group(1))
        rate = _norm_number(m.group(2))
        if base is not None and rate is not None and base > 0 and 0 < rate <= 100:
            pairs.append((rate, base))

    # Shape 2: Base al N% : amount  /  Base al N% = amount
    for m in re.finditer(
        rf"(?:base|subtotal)\s+(?:imponible\s+)?al\s+(\d+(?:[.,]\d+)?)\s*%\s*[:=]?\s*({num})",
        masked, re.IGNORECASE,
    ):
        rate = _norm_number(m.group(1))
        base = _norm_number(m.group(2))
        if base is not None and rate is not None and base > 0:
            pairs.append((rate, base))

    # Shape 3: rate% alone next to an amount (table cells) — masked text so
    # quota-after-rate lines (Shape 5) are not double-counted.
    for m in re.finditer(
        r"(?:^|\s)(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?([\d.,]{2,})\b",
        masked,
    ):
        rate = _norm_number(m.group(1))
        base = _norm_number(m.group(2))
        if base is not None and rate is not None and base > 0:
            pairs.append((rate, base))

    # Shape 4: per-rate cuota lines: '7% ... 100,00 7,00' or 'Base 100,00  Cuota 7,00'
    for m in re.finditer(
        rf"(?:^|\s)(\d+(?:[.,]\d+)?)\s*%\s*[:\s-]+\s*({num})\s*[:\s-]+\s*({num})",
        masked,
    ):
        rate = _norm_number(m.group(1))
        base = _norm_number(m.group(2))
        quota = _norm_number(m.group(3))
        if base is not None and rate is not None and base > 0 and quota is not None:
            pairs.append((rate, base))

    # Deduplicate (rate, base) keeping order
    seen = set()
    out = []
    for p in pairs:
        k = (round(p[0], 2), round(p[1], 2))
        if k not in seen:
            seen.add(k)
            out.append(p)
    return out


def _parse_subtotal(text):
    """Find the SUBTOTAL (before tax) of the invoice."""
    num = r"[$\u20ac\u00a3]?\s*\d[\d.,\s]*\d|[$\u20ac\u00a3]?\s*\d"
    for m in re.finditer(
        rf"subtotal\s*[:=]?\s*({num})\s*(?:€|eur|usd)?",
        text, re.IGNORECASE,
    ):
        v = _norm_number(m.group(1))
        if v is not None and 0 < v < 1_000_000:
            return v
    return None


def _parse_rate_cuota(text):
    """Capture per-rate quota lines like 'I.G.I.C. General (7%): 7,00' -> (rate, cuota)."""
    for m in re.finditer(
        r"(?:i\.?g\.?i\.?c\.?|i\.?v\.?a\.?|igic|iva)\s*[^:(]*\(\s*(\d+(?:[.,]\d+)?)\s*%\)\s*[:=]?\s*"
        r"(\d[\d.,\s]*\d)\b", text, re.IGNORECASE,
    ):
        rate = _norm_number(m.group(1))
        cuota = _norm_number(m.group(2))
        if rate is not None and cuota is not None and 0 < rate <= 100:
            yield rate, cuota


def _parse_total(text):
    """Find the final TOTAL of the invoice (semantic keyword search).
    Uses negative lookbehind to NOT match 'Subtotal'."""
    num = r"[$\u20ac\u00a3]?\s*\d[\d.,\s]*\d|[$\u20ac\u00a3]?\s*\d"
    patterns = [
        rf"(?<!sub)total\s*(?:a\s+pagar|factura|neto)?\s*[:=]?\s*({num})\s*(?:€|eur|usd)?",
        rf"importe\s+total\s*[:=]?\s*({num})",
        rf"amount\s*(?:due|total)?\s*[:=]?\s*({num})\s*(?:€|eur|usd)?",
    ]
    best = None
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            v = _norm_number(m.group(1))
            if v is not None and 0 < v < 1_000_000:
                best = v  # keep last: real total appears after table-header TOTAL
    return best


def _parse_tax_total(text):
    """Find the total tax amount (sum of cuotas)."""
    num = r"\d[\d.,\s]*\d|\d"
    # Handles 'IGIC: 7,00', 'I.G.I.C. General (7%): 7,00', 'IVA: 21,00', 'Cuota: 4,93',
    # and quota-after-rate: 'IVA 21% 441.00', 'USt. 19% 247.10', 'Tax: 20% 990.00'.
    # Quota-after-rate wins: the number following '%' is the tax amount, not the rate.
    for m in re.finditer(
        rf"(?:i\.?g\.?i\.?c\.?|i\.?v\.?a\.?|igic|iva|tva|ust|vat|tax|steuer|impuesto|cuota|mehrwertsteuer|m\s?w\s?st)"
        rf"[\s:.]*(\d+(?:[.,]\d+)?)\s*%\s*[:=]?\s*({num})\b",
        text, re.IGNORECASE,
    ):
        v = _norm_number(m.group(2))
        if v is not None and 0 < v < 1_000_000:
            return v
    for m in re.finditer(
        rf"(?:i\.?g\.?i\.?c\.?|i\.?v\.?a\.?|igic|iva|impuesto|cuota|tax)"
        rf"\s*(?:general|total|soportado|repercutido)?\s*(?:\(\d+(?:[.,]\d+)?%\))?\s*[:=]?\s*"
        rf"({num})\b", text, re.IGNORECASE,
    ):
        v = _norm_number(m.group(1))
        if v is not None and 0 < v < 1_000_000:
            return v
    return None


def layer2_fiscal(text):
    """Text -> tax lines + totals. Pure logic, no model, no layout."""
    pairs = _parse_fiscal(text)
    total = _parse_total(text)
    tax = _parse_tax_total(text)
    subtotal = _parse_subtotal(text)
    rate_cuotas = list(_parse_rate_cuota(text))
    reverse_charge = _detect_reverse_charge(text)

    # Reverse charge / exempt: tax due is ZERO (valid), not missing
    if reverse_charge and tax is None:
        tax = 0.0
    # No-tax invoice: subtotal == total and no tax lines found -> tax is zero, not missing
    if tax is None and total is not None and subtotal is not None and abs(total - subtotal) < 0.01:
        tax = 0.0

    lines = []
    if pairs:
        for rate, base in pairs:
            lines.append({
                "name": f"Base al {rate:g}%",
                "quantity": 1,
                "price_unit": base,
                "price_subtotal": base,
                "tax_percentage": rate,
            })
    elif subtotal and rate_cuotas and total:
        # Style: 'Subtotal: X / I.G.I.C. General (Y%): Z / Total: W'
        # One line per rate quota, base = subtotal (validated by arithmetic)
        if abs(subtotal + sum(c for _, c in rate_cuotas) - total) < 1.0:
            for rate, _cuota in rate_cuotas:
                lines.append({
                    "name": f"Base al {rate:g}%",
                    "quantity": 1,
                    "price_unit": round(subtotal, 2),
                    "price_subtotal": round(subtotal, 2),
                    "tax_percentage": rate,
                })
            pairs = [(r, subtotal) for r, _ in rate_cuotas]
    if not lines:
        # No fiscal summary found: single line with the subtotal/total as fallback
        fallback = total or subtotal
        if fallback:
            lines.append({
                "name": "Base",
                "quantity": 1,
                "price_unit": fallback,
                "price_subtotal": fallback,
                "tax_percentage": 0,
            })

    return {
        "fiscal_lines": lines,
        "amount_total": total,
        "amount_tax": tax,
        "fiscal_found": bool(pairs),
        "is_reverse_charge": reverse_charge,
    }


# --------------------------------------------------------------------------
# Layer 3 — Header via LLM (model-agnostic; interpretation only).
# --------------------------------------------------------------------------
HEADER_PROMPT = """You are an accounting assistant. From the OCR text of a supplier invoice,
extract ONLY these header fields as JSON (no explanations):
{"partner_name": string, "vat": string, "customer_vat": string, "ref": string,
 "invoice_date": "YYYY-MM-DD", "currency": string}
Rules: partner_name is the SUPPLIER name (not the recipient). vat is the SUPPLIER tax id
(CIF/NIF). invoice_date: convert to ISO (Spanish dates are DD/MM/YYYY). If a field is not
present use an empty string. Output ONLY the JSON."""


def layer3_header(cfg: OCRConfig, text):
    """Text -> header JSON. Swap cfg.llm_* to use any LLM."""
    out = _chat(cfg.llm_base_url, cfg.llm_model, cfg.llm_api_key,
                [{"role": "system", "content": HEADER_PROMPT},
                 {"role": "user", "content": text[:4500]}],
                max_tokens=300, timeout=cfg.llm_timeout)
    m = re.search(r"\{.*\}", out, re.DOTALL)
    if not m:
        return {}
    for end in range(len(m.group(0)), 0, -1):
        if m.group(0)[end - 1] != "}":
            continue
        try:
            return json.loads(m.group(0)[:end])
        except Exception:
            continue
    return {}


# --------------------------------------------------------------------------
# Layer 4 — Validation + Odoo mapping rules (model-free).
# --------------------------------------------------------------------------
def layer4_validate(header, fiscal):
    """Arithmetic sanity checks. Returns (ok, issues, merged)."""
    issues = []
    merged = dict(header)
    merged.update({
        "invoice_line_ids": fiscal["fiscal_lines"],
        "amount_total": fiscal["amount_total"],
        "amount_tax": fiscal["amount_tax"],
        "fiscal_found": fiscal["fiscal_found"],
    })

    total = fiscal["amount_total"]
    tax = fiscal["amount_tax"]
    lines = fiscal["fiscal_lines"]
    reverse_charge = fiscal.get("is_reverse_charge", False)

    if total is None:
        issues.append("amount_total missing: invoice flagged for human review")
    if tax is None and not reverse_charge:
        issues.append("amount_tax missing (may be reverse charge / exempt)")

    # Arithmetic: sum of bases should equal total minus tax (when both known)
    if total is not None and tax is not None and lines and fiscal["fiscal_found"]:
        bases_sum = round(sum(l["price_subtotal"] for l in lines), 2)
        delta = abs(bases_sum + tax - total)
        if delta > 1.0 and delta / max(total, 1e-9) > 0.01:
            issues.append(
                f"arithmetic mismatch: bases={bases_sum} + tax={tax} != total={total}"
            )

    ok = total is not None and not any("mismatch" in i or "missing" in i for i in issues)
    return ok, issues, merged


# --------------------------------------------------------------------------
# Orchestrator — the 4-layer pipeline. Agnostic end to end.
# --------------------------------------------------------------------------
def run_pipeline(pdf_path, cfg: OCRConfig = None):
    cfg = cfg or OCRConfig()
    import fitz
    # Layer 1: native text layer FIRST (digital PDFs: exact, deterministic, no model).
    # Vision is only the fallback when the text layer has no usable total
    # (scanned/image-only PDFs, or layouts where values precede labels).
    doc = fitz.open(pdf_path)
    text_layer = "\n".join(p.get_text() for p in doc[: cfg.max_pages])
    doc.close()
    text_layer = text_layer.strip()
    source = "text-layer"

    # Vision fallback: scanned/image-only PDFs, or layouts where the text
    # layer has no usable total (values precede labels).
    vision_text = None
    if len(text_layer) < 60 or layer2_fiscal(text_layer).get("amount_total") is None:
        images = pdf_to_images(pdf_path, cfg.dpi, cfg.max_pages)
        vision_text = ""
        for img in images:
            vision_text += layer1_vision(cfg, img) + "\n"
        vision_text = vision_text.strip()

    # Layer 1 decision: fiscal wants a total-bearing text, header wants exact text.
    fiscal_text = vision_text if (vision_text and layer2_fiscal(text_layer).get("amount_total") is None) else text_layer
    header_text = text_layer if len(text_layer) >= 60 else (vision_text or text_layer)
    if vision_text and layer2_fiscal(fiscal_text).get("amount_total") is None:
        source = "vision"
    elif not vision_text and fiscal_text == text_layer:
        source = "text-layer"
    elif vision_text:
        source = "hybrid"
    else:
        source = "text-layer"

    # Layer 2: fiscal block (deterministic)
    fiscal = layer2_fiscal(fiscal_text)

    # Layer 3: header (LLM)
    header = layer3_header(cfg, header_text)

    # Layer 4: validation
    ok, issues, merged = layer4_validate(header, fiscal)
    merged["_ok"] = ok
    merged["_issues"] = issues
    merged["_raw_text"] = (fiscal_text + "\n---HEADER---\n" + header_text)[:2000]
    merged["_source"] = source
    return merged
