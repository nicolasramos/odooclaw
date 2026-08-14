#!/usr/bin/env python3
"""RapidOCR extractor for OdooClaw OCR skill.

Pipeline 100% CPU (N100): RapidOCR (texto + coordenadas) -> parser posicional
-> lógica de negocio (vendors conocidos, impuestos, validaciones).

Portado de las pautas del flujo n8n de OCR de facturas
(limpiador universal) + módulo account_dynamic_rules (reglas Odoo).
Reemplaza al VL 450M en el flujo de facturas: un solo motor, sin modelo de visión.
"""

import json
import os
import re
import subprocess
import sys
import tempfile
from typing import Any, Optional


def log(msg: str) -> None:
    sys.stderr.write(f"[ocr-rapidocr] {msg}\n")
    sys.stderr.flush()


# ---------------------------------------------------------------------------
# Mapa de vendors conocidos (configurable, sin datos especificos)
# ---------------------------------------------------------------------------
KNOWN_VENDORS: dict[str, dict[str, str]] = {}


def _load_known_vendors(extra: Optional[dict[str, dict[str, str]]] = None) -> None:
    """Carga vendors conocidos. Por defecto vacío (configurable por el usuario)."""
    KNOWN_VENDORS.clear()
    if extra:
        KNOWN_VENDORS.update(extra)


# ---------------------------------------------------------------------------
# Números
# ---------------------------------------------------------------------------
def clean_number(num: Any) -> float:
    if isinstance(num, (int, float)):
        return float(num)
    if num is None:
        return 0.0
    s = str(num).strip()
    if not s:
        return 0.0
    # Quitar símbolos de moneda y espacios
    s = s.replace("€", "").replace("EUR", "").replace("$", "").replace("USD", "")
    s = s.replace(" ", "").replace("\u00a0", "")
    if s.count(",") == 1 and s.count(".") == 0:
        s = s.replace(",", ".")
    elif s.count(",") >= 1 and s.count(".") >= 1:
        # europeo 1.234,56 -> el separador decimal es la última coma
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    try:
        return float(s)
    except ValueError:
        return 0.0


# ---------------------------------------------------------------------------
# Fechas (heurística DD/MM/YYYY vs MM/DD/YYYY)
# ---------------------------------------------------------------------------
def norm_date(value: Any, default: str = "") -> str:
    if not value:
        return default
    s = str(value).strip()
    if re.match(r"\d{4}-\d{2}-\d{2}", s):
        return s[:10]
    m = re.match(r"(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})", s)
    if m:
        a, b, y = m.groups()
        y = "20" + y if len(y) == 2 else y
        if int(a) > 12:
            d, mo = int(a), int(b)
        elif int(b) > 12:
            mo, d = int(a), int(b)
        else:
            mo, d = int(a), int(b)  # ambiguo: asumir mes/día (US)
        return f"{int(y):04d}-{mo:02d}-{d:02d}"
    # formato largo "May 7th, 2025" / "Aug 13, 2018"
    from datetime import datetime

    cleaned = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", s)
    for fmt in ("%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y", "%b %d %Y", "%B %d %Y"):
        try:
            return datetime.strptime(cleaned, fmt).strftime("%Y-%m-%d")
        except Exception:
            continue
    return default


# ---------------------------------------------------------------------------
# RapidOCR engine (lazy singleton)
# ---------------------------------------------------------------------------
_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR

            _engine = RapidOCR()
        except ImportError:
            raise RuntimeError(
                "rapidocr-onnxruntime no está instalado. "
                "Instala con: pip install rapidocr-onnxruntime"
            )
    return _engine


def _pdf_to_images(pdf_data: bytes, dpi: int = 170, max_pages: int = 4):
    """Convierte PDF a imágenes JPEG. Devuelve lista de (bytes, path)."""
    out = []
    with tempfile.TemporaryDirectory(prefix="ocr_rapid_") as workdir:
        pdf_path = os.path.join(workdir, "invoice.pdf")
        with open(pdf_path, "wb") as f:
            f.write(pdf_data)
        prefix = os.path.join(workdir, "page")
        bin_path = (
            "/opt/homebrew/bin/pdftoppm"
            if os.path.exists("/opt/homebrew/bin/pdftoppm")
            else "pdftoppm"
        )
        cmd = [bin_path, "-jpeg", "-r", str(dpi), pdf_path, prefix]
        proc = subprocess.run(cmd, capture_output=True, timeout=120)
        if proc.returncode != 0:
            return {"isError": True, "content": f"pdftoppm failed: {proc.stderr.decode(errors='replace')[:500]}"}
        pages = sorted(
            [p for p in os.listdir(workdir) if p.endswith(".jpg")],
            key=lambda p: int(re.search(r"(\d+)", p).group(1)),
        )[:max_pages]
        for page in pages:
            with open(os.path.join(workdir, page), "rb") as f:
                out.append((f.read(), os.path.join(workdir, page)))
    return {"images": out}


# ---------------------------------------------------------------------------
# Parser posicional: convierte resultados de RapidOCR en filas/columnas
# ---------------------------------------------------------------------------
def _rows_from_ocr(result, y_tolerance: float = 15.0):
    """Agrupa detecciones de RapidOCR en filas ordenadas.

    result: lista de [box(4 puntos), texto, confianza]
    Devuelve: list[(y_center, [(x_center, text)])]
    """
    items = []
    for box, text, conf in result:
        if not text or not text.strip():
            continue
        ys = [p[1] for p in box]
        xs = [p[0] for p in box]
        items.append(((min(ys) + max(ys)) / 2, (min(xs) + max(xs)) / 2, text.strip()))
    items.sort(key=lambda t: t[0])
    rows = []
    for y, x, text in items:
        if rows and abs(y - rows[-1][0]) <= y_tolerance:
            rows[-1][1].append((x, text))
        else:
            rows.append((y, [(x, text)]))
    for _, cells in rows:
        cells.sort(key=lambda c: c[0])
    return rows


def _find_row(rows, keyword: str, after: Optional[float] = None):
    """Busca la primera fila cuyo texto contiene keyword (case-insensitive)."""
    kw = keyword.lower()
    for y, cells in rows:
        if after is not None and y < after:
            continue
        joined = " ".join(t for _, t in cells).lower()
        if kw in joined:
            return y, cells
    return None


# ---------------------------------------------------------------------------
# Extracción posicional de cabecera y líneas
# ---------------------------------------------------------------------------
def parse_invoice(ocr_result, all_text: str) -> dict[str, Any]:
    """Extrae cabecera + líneas de tabla a partir del OCR posicional."""
    rows = _rows_from_ocr(ocr_result)
    data: dict[str, Any] = {
        "partner_name": "",
        "vat": "",
        "customer_vat": "",
        "ref": "",
        "invoice_date": "",
        "currency": "EUR",
        "amount_total": 0.0,
        "is_reverse_charge": False,
        "number_of_pages": 1,
        "invoice_line_ids": [],
    }
    lower_all = all_text.lower()

    # --- Reverse charge / exento ---
    for flag in (
        "reverse charge",
        "inversión del sujeto pasivo",
        "inversion del sujeto pasivo",
        "steuerschuldnerschaft",
        "vat exempt",
        "intracomunit",
    ):
        if flag in lower_all:
            data["is_reverse_charge"] = True
            break

    # --- Ref: junto a "invoice no", "factura nº", "number" (o la fila siguiente) ---
    for kw in ("invoice no", "invoice number", "factura nº", "factura n", "number", "invoice"):
        row = _find_row(rows, kw)
        if row:
            y0, cells = row
            joined = " | ".join(t for _, t in cells)
            m = re.search(
                r"\b(?:invoice\s*(?:no\.?|number)|factura\s*(?:nº|n\.?|numero|número)|no\.?|number|nº|n\.?)\s*[:#]?\s*([A-Z0-9/\-_]{3,30})",
                joined,
                re.IGNORECASE,
            )
            if not m:
                # El valor suele estar en la fila siguiente (header y valor separados)
                for y2, cells2 in rows:
                    if y2 > y0 + 80:
                        break
                    if y2 <= y0:
                        continue
                    joined2 = " ".join(t for _, t in cells2)
                    m2 = re.search(r"\b([A-Z0-9/\-_]{3,30})\b", joined2)
                    if m2 and not re.search(r"(date|fecha|total|amount)", joined2, re.IGNORECASE):
                        m = m2
                        break
            if m:
                data["ref"] = m.group(1).strip()
                break

    # --- Fecha: junto a "date" / "fecha" / "data" (o la fila siguiente) ---
    for kw in ("date", "fecha", "data"):
        row = _find_row(rows, kw)
        if row:
            y0, cells = row
            joined = " ".join(t for _, t in cells)
            m = re.search(r"(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}|[A-Z][a-z]{2}\.?\s+\d{1,2},?\s+\d{4})", joined)
            if not m:
                for y2, cells2 in rows:
                    if y2 > y0 + 80:
                        break
                    if y2 <= y0:
                        continue
                    joined2 = " ".join(t for _, t in cells2)
                    m = re.search(r"(\d{1,2}[/.]\d{1,2}[/.]\d{2,4}|[A-Z][a-z]{2}\.?\s+\d{1,2},?\s+\d{4})", joined2)
                    if m:
                        break
            if m:
                data["invoice_date"] = norm_date(m.group(1))
                break

    # --- Total: la fila con "total" más cercana al final (excluyendo subtotal) ---
    total_candidates = [r for r in rows if re.search(r"\btotal\b", " ".join(t for _, t in r[1]), re.IGNORECASE) and "subtotal" not in " ".join(t for _, t in r[1]).lower()]
    if total_candidates:
        _, cells = total_candidates[-1]
        joined = " ".join(t for _, t in cells)
        nums = [clean_number(t) for t in joined.replace(",", " ").split() if re.search(r"\d", t)]
        nums = [n for n in nums if n > 0]
        if nums:
            # el total es el número más grande de la fila
            data["amount_total"] = max(nums)

    # --- Moneda ---
    if "€" in all_text or "eur" in lower_all:
        data["currency"] = "EUR"
    elif "$" in all_text or "usd" in lower_all:
        data["currency"] = "USD"
    elif "£" in all_text or "gbp" in lower_all:
        data["currency"] = "GBP"

    # --- Líneas de tabla: filas entre el header de columnas y subtotal/total ---
    # Header SOLO en la mitad superior (evita falsos positivos en notas del pie)
    max_y = max((r[0] for r in rows), default=0)
    header_row = None
    for kw in ("item", "quantity", "cantidad", "product description", "product", "articulo", "artículo", "descripcion", "descripción"):
        r = _find_row(rows, kw)
        if r and r[0] < max_y * 0.6:
            header_row = r
            break
    end_row = None
    for kw in ("subtotal", "total", "importe total"):
        r = _find_row(rows, kw)
        if r:
            end_row = r
            break
    if header_row and end_row and end_row[0] > header_row[0]:
        for y, cells in header_row[1] if header_row else []:
            pass
        for y, cells in rows:
            if y <= header_row[0] or y >= end_row[0]:
                continue
            joined = " ".join(t for _, t in cells)
            # Solo filas con al menos un número
            if not re.search(r"\d", joined):
                continue
            # Separar SOLO tokens numéricos completos (no códigos incrustados tipo PO02529)
            num_tokens = re.findall(r"(?<![\w])[\d.,]+(?![\w])", joined)
            nums = [clean_number(t) for t in num_tokens]
            nums = [n for n in nums if n > 0]
            # Quitar el texto de la descripción (eliminar tokens numéricos completos)
            desc = re.sub(r"(?<![\w])[\d.,]+(?![\w])", " ", joined).strip()
            desc = re.sub(r"[\$€£]\s*", "", desc).strip()
            desc = re.sub(r"\s{2,}", " ", desc).strip()
            line = {
                "name": desc or "Item",
                "quantity": 1.0,
                "price_unit": 0.0,
                "price_subtotal": 0.0,
                "discount": 0.0,
                "tax_rate": 0.0,
            }
            if nums:
                # asumir [precio, cantidad, total] o [total] — usar el último como total
                if len(nums) >= 3:
                    line["price_unit"] = nums[0]
                    line["quantity"] = nums[1]
                    line["price_subtotal"] = nums[-1]
                elif len(nums) == 2:
                    line["price_unit"] = nums[0]
                    line["price_subtotal"] = nums[1]
                else:
                    line["price_subtotal"] = nums[0]
                    line["price_unit"] = nums[0]
            # Recalcular qty si subtotal/price no coincide (Office Chair $4.00 x ? = $20.00)
            if line["price_unit"] > 0 and line["price_subtotal"] > 0 and line["quantity"] == 1.0:
                implied = line["price_subtotal"] / line["price_unit"]
                if abs(implied - 1.0) > 0.05 and abs(implied - round(implied)) < 0.01:
                    line["quantity"] = round(implied)
            # Detectar "GRATIS" / "free" / "0.00" en portes
            if "gratis" in joined.lower() or "free" in joined.lower() or line["price_subtotal"] == 0:
                line["quantity"] = 0.0
            if line["price_subtotal"] > 0 or line["price_unit"] > 0:
                data["invoice_line_ids"].append(line)

    # --- Partner: primera fila con nombre (no códigos, no keywords) ---
    for y, cells in rows[:8]:
        joined = " ".join(t for _, t in cells)
        if len(joined) < 3:
            continue
        # Saltar códigos/refs (empiezan con #, $, dígito) y filas vacías
        if re.match(r"^[\s#\$\d\W]", joined):
            continue
        if re.search(
            r"invoice|factura|date|fecha|page|tel|email|www|bill|due|balance|no\.?|amount|total|subtotal",
            joined.lower(),
        ):
            continue
        data["partner_name"] = joined
        break

    # --- VAT: buscar patrón CIF/NIF (excluyendo contextos bancarios) ---
    # Excluir líneas que contengan IFSC/Bank/Account (suelen ser códigos bancarios)
    bank_lines = []
    for y, cells in rows:
        joined = " ".join(t for _, t in cells).lower()
        if "ifsc" in joined or "bank" in joined or "account no" in joined or "iban" in joined:
            bank_lines.append(joined)
    _VAT_RE = r"\b([A-HJ-NP-SUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[A-Z]{2}[\dA-Z]{6,12}\d|[A-Z]{2}[\d.]{9,14})\b"
    vat_m = re.search(_VAT_RE, all_text)
    if vat_m:
        vat = vat_m.group(1)
        # Si el match cae en una línea bancaria, buscar el siguiente candidato
        for bl in bank_lines:
            if vat.lower() in bl:
                vat = ""
                rest = all_text
                for m2 in re.finditer(_VAT_RE, all_text):
                    cand = m2.group(1)
                    if not any(cand.lower() in bl2 for bl2 in bank_lines):
                        vat = cand
                        break
                break
        if vat:
            data["vat"] = vat

    return data


# ---------------------------------------------------------------------------
# Lógica de negocio (portada del limpiador n8n)
# ---------------------------------------------------------------------------
def apply_business_rules(data: dict[str, Any], raw_text: str = "", company_vats: Optional[list[str]] = None) -> dict[str, Any]:
    """Aplica reglas de negocio: vendors conocidos, validaciones, impuestos."""
    company_vats = company_vats or []
    lower = raw_text.lower()

    # Anti-auto-factura: si el VAT detectado es de NUESTRA empresa, descartar
    vat = (data.get("vat") or "").upper().replace(" ", "")
    if vat in [v.upper().replace(" ", "") for v in company_vats]:
        data["vat"] = ""
        data["partner_name"] = ""

    # Vendor conocido por texto (si la config tiene KNOWN_VENDORS)
    detected = None
    for key, vendor in KNOWN_VENDORS.items():
        if key.lower() in lower:
            detected = vendor
            break
    if detected:
        data["partner_name"] = detected["name"]
        data["vat"] = detected["vat"]

    # Sanity: si no hay partner, marcar pendiente
    if not data.get("partner_name"):
        data["partner_name"] = "PROVEEDOR_PENDIENTE"

    # Líneas: limpiar vacías
    valid = []
    for line in data.get("invoice_line_ids", []):
        if line["price_unit"] == 0 and line["price_subtotal"] == 0 and line["quantity"] == 0:
            continue
        if line["quantity"] == 0 and line["price_subtotal"] > 0:
            line["quantity"] = 1.0
        valid.append(line)
    data["invoice_line_ids"] = valid

    data["amount_untaxed"] = round(sum(l["price_subtotal"] for l in valid), 2)

    # Si no hay líneas pero hay total: crear línea única genérica
    if not valid and data.get("amount_total", 0) > 0:
        data["invoice_line_ids"] = [
            {
                "name": data.get("partner_name", "Item"),
                "quantity": 1.0,
                "price_unit": data["amount_total"],
                "price_subtotal": data["amount_total"],
                "discount": 0.0,
                "tax_rate": 0.0,
            }
        ]
        data["amount_untaxed"] = data["amount_total"]

    return data


# ---------------------------------------------------------------------------
# API principal
# ---------------------------------------------------------------------------
def extract_invoice_rapidocr(
    pdf_data: bytes,
    dpi: int = 170,
    max_pages: int = 4,
    known_vendors: Optional[dict[str, dict[str, str]]] = None,
    company_vats: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Pipeline completo: PDF -> RapidOCR -> parser posicional -> reglas."""
    _load_known_vendors(known_vendors)
    try:
        engine = _get_engine()
    except RuntimeError as exc:
        return {"isError": True, "content": str(exc)}

    pages = _pdf_to_images(pdf_data, dpi=dpi, max_pages=max_pages)
    if pages.get("isError"):
        return pages

    all_text_parts = []
    ocr_results = []
    for image_bytes, image_path in pages["images"]:
        try:
            # El path del tempdir ya no existe al salir de _pdf_to_images:
            # escribir los bytes a un archivo propio con nombre único.
            import uuid

            tmp_img = os.path.join(tempfile.gettempdir(), f"ocr_rapid_{uuid.uuid4().hex}.jpg")
            with open(tmp_img, "wb") as f:
                f.write(image_bytes)
            try:
                result, _elapse = engine(tmp_img)
            finally:
                if os.path.exists(tmp_img):
                    os.unlink(tmp_img)
            if result:
                ocr_results.extend(result)
                for box, text, conf in result:
                    all_text_parts.append(text)
        except Exception as exc:
            log(f"RapidOCR error en página: {exc}")

    all_text = "\n".join(all_text_parts)
    if not all_text.strip():
        return {"isError": True, "content": "RapidOCR no encontró texto en el documento"}

    data = parse_invoice(ocr_results, all_text)
    data = apply_business_rules(data, raw_text=all_text, company_vats=company_vats)

    return {
        "success": True,
        "ocr_engine": "rapidocr",
        "invoice_data": data,
        "raw_text": all_text,
    }


if __name__ == "__main__":
    # Test manual: python3 rapidocr_extractor.py /path/to/file.pdf
    import sys as _sys

    if len(_sys.argv) < 2:
        print("Uso: rapidocr_extractor.py <pdf> [--vendors vendors.json]")
        _sys.exit(1)
    with open(_sys.argv[1], "rb") as f:
        pdf = f.read()
    res = extract_invoice_rapidocr(pdf)
    print(json.dumps(res, indent=2, ensure_ascii=False)[:3000])
