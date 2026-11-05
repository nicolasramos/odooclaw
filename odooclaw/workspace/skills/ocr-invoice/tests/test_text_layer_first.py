"""The chat path must read the same way the ``read_document`` tool does.

A vendor bill created from an unreadable document looks booked: it is a draft
with 0.00, it carries the original PDF, and nobody notices until the accountant
does. So the order (text layer before any model) and the refusal (no amounts, no
bill) are asserted here, not in a log line.

Regression this pins: the M4 deployment has no vision model. Before this, the
``ocr-create-vendor-bill`` tool went straight to ``VISION_API_BASE``, the
extraction came back empty and the bill was created without lines or amounts.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import document_reader as dr  # noqa: E402
import pipeline  # noqa: E402
from pipeline import layer2_fiscal  # noqa: E402
from server import OdooOCRSkill  # noqa: E402

PDF_BYTES = b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n"

# The acceptance document: supplier, reference, one row of 2 x 100 and the
# fiscal summary. Laid out the way ``pdftotext -layout`` prints it.
INVOICE_TEXT = """Suministros Prueba SL
CIF: B12345678
Factura n: F-2026-0042
Fecha: 03/11/2026

Descripcion                Cantidad   Precio    Importe
Servicio de prueba            2        100,00    200,00

Base imponible: 200,00
IVA 21%: 42,00
Total: 242,00
"""


class StubSkill(OdooOCRSkill):
    """The MCP server without Odoo: download and engines are injected."""

    def __init__(self, payload):
        super().__init__()
        self.payload = payload
        self.vision_calls = 0
        self.created = []

    def _download_attachment(self, attachment_id):
        return {
            "attachment_id": attachment_id,
            "name": "factura_proveedor_F-2026-0042.pdf",
            "mimetype": "application/pdf",
            "data": self.payload,
        }

    def _odoo_call(self, *args, **kwargs):
        # runonweb_ocr_text lives on ir.attachment; this deployment has no addon
        return {"result": []}

    def _call_vision(self, attachment):  # pragma: no cover - must never run
        self.vision_calls += 1
        return {"isError": True, "content": "no vision model in this deployment"}

    def _call_rapidocr(self, attachment):
        return {"isError": True, "content": "rapidocr not installed"}

    def _call_external_ocr(self, attachment):
        return {"isError": True, "content": "no external OCR configured"}

    def _create_vendor_bill(self, invoice_data, attachment):
        self.created.append(invoice_data)
        return {"move_id": 99, "partner_id": 1, "attachment_linked": True}


@pytest.fixture
def text_layer(monkeypatch, tmp_path):
    """poppler stand-in: the PDF has a real text layer."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    script = bin_dir / "pdftotext"
    script.write_text("#!/bin/sh\ncat <<'PDFTEXT'\n" + INVOICE_TEXT + "\nPDFTEXT\n")
    script.chmod(0o755)
    monkeypatch.setattr(
        dr, "_binary", lambda name: str(script) if name == "pdftotext" else None
    )

    def header(cfg, text):
        return {"partner_name": "Suministros Prueba SL", "vat": "B12345678",
                "ref": "HEADER-GUESS", "invoice_date": "2026-11-03", "currency": "EUR"}

    monkeypatch.setattr(pipeline, "layer3_header", header)
    return script


@pytest.fixture
def blank_text_layer(monkeypatch, tmp_path):
    """poppler stand-in for a scan: a form feed and nothing else."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    script = bin_dir / "pdftotext"
    script.write_text("#!/bin/sh\nprintf '\\f'\n")
    script.chmod(0o755)
    monkeypatch.setattr(
        dr, "_binary", lambda name: str(script) if name == "pdftotext" else None
    )
    return script


def test_item_row_is_read_with_its_quantity_and_unit_price():
    rows = pipeline._parse_item_lines(INVOICE_TEXT)
    assert len(rows) == 1
    row = rows[0]
    assert row["quantity"] == 2
    assert row["price_unit"] == 100.0
    assert row["price_subtotal"] == 200.0
    assert "Servicio de prueba" in row["name"]


def test_item_rows_win_over_the_single_base_row_when_they_add_up():
    fiscal = layer2_fiscal(INVOICE_TEXT)
    assert fiscal["amount_subtotal"] == 200.0
    assert len(fiscal["fiscal_lines"]) == 1
    line = fiscal["fiscal_lines"][0]
    assert (line["quantity"], line["price_unit"]) == (2, 100.0)
    assert line["tax_percentage"] == 21.0


def test_item_rows_are_discarded_when_they_do_not_add_up():
    text = INVOICE_TEXT.replace("100,00    200,00", "90,00     180,00")
    fiscal = layer2_fiscal(text)
    line = fiscal["fiscal_lines"][0]
    # 180 != 200 base, so the deterministic base row stands.
    assert (line["quantity"], line["price_unit"]) == (1, 200.0)


def test_extract_invoice_reads_the_text_layer_without_asking_the_vision_model(text_layer):
    skill = StubSkill(PDF_BYTES)
    result = skill.extract_invoice(1)
    assert "isError" not in result

    data = __import__("json").loads(result["content"])["invoice_data"]
    assert data["ref"] == "F-2026-0042"
    assert data["amount_untaxed"] == 200.0
    assert data["amount_total"] == 242.0
    assert len(data["invoice_line_ids"]) == 1
    assert data["invoice_line_ids"][0]["quantity"] == 2
    assert data["invoice_line_ids"][0]["price_unit"] == 100.0
    assert skill.vision_calls == 0


def test_a_scan_with_no_text_layer_still_reaches_the_vision_fallback(blank_text_layer):
    skill = StubSkill(PDF_BYTES)
    skill.extract_invoice(1)
    assert skill.vision_calls == 1


def test_extract_and_create_refuses_a_bill_with_no_amounts():
    skill = StubSkill(PDF_BYTES)
    skill.extract_invoice = lambda *a, **k: {
        "content": '{"success": true, "invoice_data": {"ref": "OCR", "partner_name": "",'
        ' "amount_untaxed": 0, "amount_tax": 0, "amount_total": 0,'
        ' "invoice_line_ids": [{"name": "Item", "quantity": 1,'
        ' "price_unit": 0, "tax_percentage": 0}]}}'
    }

    result = skill.extract_and_create_vendor_bill(1)
    assert result.get("isError") is True
    assert "Refusing to create a vendor bill with no amounts" in result["content"]
    assert skill.created == []


def test_extract_and_create_writes_the_bill_when_the_amounts_are_there(text_layer):
    skill = StubSkill(PDF_BYTES)
    result = skill.extract_and_create_vendor_bill(1)
    assert "isError" not in result
    assert len(skill.created) == 1
    assert skill.created[0]["amount_untaxed"] == 200.0


# --- The header must not depend on the model answering ---------------------
# The M4 runs LFM3, a small model that rambles past its 300-token JSON budget
# and got truncated mid-object, which left partner_name empty and created a
# partner called "Proveedor OCR" on every bill. These three pin the rule that
# the document is the source of truth for what it states plainly.

REAL_LAYOUT = """Suministros Prueba SL
CIF: B12345678
Calle de Prueba 1, 38001 Santa Cruz de Tenerife

Factura n: F-2026-0042
Fecha: 03/11/2026

Descripcion                        Cantidad       Precio   Importe
Servicio de prueba                    2           100,00   200,00

Base imponible: 200,00
IVA 21%: 42,00
Total: 242,00
"""


def test_header_is_read_from_the_letterhead_without_a_model():
    header = pipeline.layer3_header_rules(REAL_LAYOUT)
    assert header["partner_name"] == "Suministros Prueba SL"
    assert header["vat"] == "B12345678"
    assert header["ref"] == "F-2026-0042"
    assert header["invoice_date"] == "2026-11-03"
    assert header["currency"] == "EUR"


def test_a_dead_model_leaves_the_header_and_the_numbers_intact(monkeypatch):
    def dead(cfg, text):
        raise RuntimeError("HTTP Error 401: Unauthorized")

    monkeypatch.setattr(pipeline, "_layer3_header_llm", dead)
    data = pipeline.run_pipeline_from_text(REAL_LAYOUT, pipeline.OCRConfig())

    assert data["partner_name"] == "Suministros Prueba SL"
    assert data["vat"] == "B12345678"
    assert data["amount_total"] == 242.0
    assert data["amount_untaxed"] == 200.0
    assert data["_ok"] is True


def test_the_model_cannot_overwrite_what_the_document_states(monkeypatch):
    def guesser(cfg, text):
        return {"partner_name": "Otra Empresa SL", "currency": "USD",
                "customer_vat": "B99999999"}

    monkeypatch.setattr(pipeline, "_layer3_header_llm", guesser)
    header = pipeline.layer3_header(pipeline.OCRConfig(), REAL_LAYOUT)

    assert header["partner_name"] == "Suministros Prueba SL"
    assert header["currency"] == "EUR"
    # Gaps the rules do not cover are still filled by the model.
    assert header["customer_vat"] == "B99999999"
