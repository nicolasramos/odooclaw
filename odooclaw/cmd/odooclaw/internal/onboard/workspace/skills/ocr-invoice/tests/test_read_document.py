"""read_document owns the write-call-clean sequence, so the tests pin the sequence.

A regression here is quiet: the tool still answers, but with an invoice that
has no amounts, or with a client document left on disk. Neither shows up in a
log line, so the order of the steps (text layer before vision, cleanup in a
``finally``, deterministic numbers over the model's guess) is asserted here.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import document_reader as dr  # noqa: E402
from pipeline import layer2_fiscal, layer4_validate  # noqa: E402

PDF_BYTES = b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n"

INVOICE_TEXT = """ACME SUMINISTROS SL
CIF: B12345678
Factura n: F-2026-0042
Fecha: 03/11/2026

Base imponible: 100,00
IVA 21%: 21,00
Total: 121,00
"""


class FakeCompleted:
    def __init__(self, stdout="", stderr="", returncode=0):
        self.stdout = stdout
        self.stderr = stderr
        self.returncode = returncode


def fake_runner(stdout="", stderr="", returncode=0, calls=None):
    def run(cmd, **kwargs):
        if calls is not None:
            calls.append((cmd, kwargs))
        return FakeCompleted(stdout, stderr, returncode)

    return run


def _stub_pdftotext(tmp_path, monkeypatch, script_body):
    """Install a real executable named pdftotext so the subprocess path runs."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    script = bin_dir / "pdftotext"
    script.write_text(script_body)
    script.chmod(0o755)
    monkeypatch.setattr(
        dr, "_binary", lambda name: str(script) if name == "pdftotext" else None
    )
    return script


@pytest.fixture
def stub_pdftotext(tmp_path, monkeypatch):
    """poppler stand-in that prints a real invoice text layer."""
    return _stub_pdftotext(
        tmp_path, monkeypatch, "#!/bin/sh\ncat <<'PDFTEXT'\n" + INVOICE_TEXT + "\nPDFTEXT\n"
    )


@pytest.fixture
def stub_blank_pdftotext(tmp_path, monkeypatch):
    """poppler stand-in for a scanned page: a form feed and nothing else."""
    return _stub_pdftotext(tmp_path, monkeypatch, "#!/bin/sh\nprintf '\\f'\n")


def pipeline_over_real_parser(text):
    """A header guess that is wrong on purpose: the parser must win."""
    fiscal = layer2_fiscal(text)
    ok, issues, merged = layer4_validate(
        {"partner_name": "ACME SUMINISTROS SL", "ref": "HEADER-GUESS", "amount_total": 999.99},
        fiscal,
    )
    merged["_ok"] = ok
    merged["_issues"] = issues
    return merged


def test_pdf_is_recognised_from_bytes_when_the_mimetype_lies():
    kind = dr.detect_kind("escaneo.bin", "application/octet-stream", PDF_BYTES)
    assert kind == "pdf"


def test_image_is_recognised_from_the_extension():
    assert dr.detect_kind("foto.JPEG", "", b"\xff\xd8\xff") == "image"


def test_voice_note_is_audio_not_a_document():
    assert dr.detect_kind("nota.ogg", "audio/ogg", b"OggS") == "audio"


def test_a_page_number_is_not_a_text_layer():
    assert dr.has_usable_text("Pagina 1") is False
    assert dr.has_usable_text(INVOICE_TEXT) is True


def test_pdf_text_is_read_with_layout_and_a_page_limit(monkeypatch, tmp_path):
    monkeypatch.setattr(dr, "_binary", lambda name: f"/usr/bin/{name}")
    calls = []

    text = dr.extract_pdf_text(
        "/tmp/doc.pdf",
        max_pages=2,
        runner=fake_runner(stdout="Total 121,00\fTotal 242,00", calls=calls),
    )

    cmd, _kwargs = calls[0]
    assert "-layout" in cmd, "layout mode keeps labels beside their values"
    assert cmd[cmd.index("-l") + 1] == "2"
    assert "\f" not in text and text.endswith("242,00")


def test_pdf_text_extraction_says_when_poppler_is_missing(monkeypatch):
    monkeypatch.setattr(dr, "_binary", lambda name: None)

    with pytest.raises(dr.DocumentReaderError, match="poppler"):
        dr.extract_pdf_text("/tmp/doc.pdf")


def test_pdftotext_failure_is_reported_with_the_exit_code(monkeypatch):
    monkeypatch.setattr(dr, "_binary", lambda name: f"/usr/bin/{name}")

    with pytest.raises(dr.DocumentReaderError, match="exit 1"):
        dr.extract_pdf_text(
            "/tmp/doc.pdf",
            runner=fake_runner(returncode=1, stderr="May not be a PDF file"),
        )


def test_digital_pdf_returns_text_and_parser_numbers(stub_pdftotext, tmp_path):
    work = tmp_path / "work"
    work.mkdir()

    payload = dr.read_document_bytes(
        PDF_BYTES,
        filename="factura.pdf",
        mimetype="application/pdf",
        attachment_id=42,
        pipeline_runner=pipeline_over_real_parser,
        workdir=str(work),
        ocr_image=None,
        timeout=30,
        clock=lambda: 0,
    )

    assert payload["text_source"] == "pdf_text_layer"
    assert payload["attachment_id"] == 42
    # The deterministic parser wins over the header guess in both fields.
    assert payload["amount_total"] == 121.0
    assert payload["invoice_number"] == "F-2026-0042"
    assert payload["lines"][0]["price_subtotal"] == 100.0
    assert payload["validation_ok"] is True
    assert list(work.iterdir()) == [], "the scratch file must not outlive the call"


def test_scan_without_a_text_layer_is_ocred_and_cleaned(
    stub_blank_pdftotext, monkeypatch, tmp_path
):
    seen = {}

    def ocr(image, mimetype):
        seen["mimetype"] = mimetype
        return "ACME SUMINISTROS SL\nTotal: 121,00"

    monkeypatch.setattr(dr, "render_pdf_pages", lambda *a, **k: [b"page-one"])
    work = tmp_path / "work"
    work.mkdir()

    payload = dr.read_document_bytes(
        PDF_BYTES,
        filename="escaneo.pdf",
        mimetype="application/pdf",
        pipeline_runner=pipeline_over_real_parser,
        workdir=str(work),
        ocr_image=ocr,
        timeout=30,
        clock=lambda: 0,
    )

    assert payload["text_source"] == "vision_ocr"
    assert seen["mimetype"] == "image/png"
    assert payload["text"] == "ACME SUMINISTROS SL\nTotal: 121,00"
    assert list(work.iterdir()) == []


def test_scan_without_an_ocr_engine_explains_the_gap(
    stub_blank_pdftotext, monkeypatch, tmp_path
):
    monkeypatch.setattr(dr, "render_pdf_pages", lambda *a, **k: [b"page-one"])
    work = tmp_path / "work"
    work.mkdir()

    with pytest.raises(dr.DocumentReaderError, match="no text layer"):
        dr.read_document_bytes(
            PDF_BYTES,
            filename="escaneo.pdf",
            mimetype="application/pdf",
            workdir=str(work),
            ocr_image=None,
            clock=lambda: 0,
        )
    assert list(work.iterdir()) == []


def test_ocr_engine_failure_becomes_a_reader_error(tmp_path):
    def boom(image, mimetype):
        raise ConnectionError("vision endpoint unreachable")

    work = tmp_path / "work"
    work.mkdir()

    with pytest.raises(dr.DocumentReaderError, match="vision endpoint unreachable"):
        dr.read_document_bytes(
            b"\x89PNG\r\n\x1a\n",
            filename="factura.png",
            mimetype="image/png",
            workdir=str(work),
            ocr_image=boom,
            clock=lambda: 0,
        )


def test_image_attachment_is_ocred(tmp_path):
    payload = dr.read_document_bytes(
        b"\x89PNG\r\n\x1a\n",
        filename="ticket.png",
        mimetype="image/png",
        ocr_image=lambda image, mimetype: "TICKET 12,50",
        workdir=str(tmp_path),
        pipeline_runner=None,
        clock=lambda: 0,
    )

    assert payload["kind"] == "image"
    assert payload["text_source"] == "vision_ocr"
    assert payload["is_invoice"] is False


def test_voice_note_names_the_transcription_tool(tmp_path):
    with pytest.raises(dr.DocumentReaderError, match="whisper-stt"):
        dr.read_document_bytes(
            b"OggS",
            filename="nota.ogg",
            mimetype="audio/ogg",
            workdir=str(tmp_path),
            clock=lambda: 0,
        )


def test_an_office_file_is_refused_instead_of_read_as_garbage(tmp_path):
    with pytest.raises(dr.DocumentReaderError, match="only PDF, images and plain text"):
        dr.read_document_bytes(
            b"PK\x03\x04",
            filename="presupuesto.docx",
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            workdir=str(tmp_path),
            clock=lambda: 0,
        )


def test_plain_text_attachment_needs_no_ocr(tmp_path):
    payload = dr.read_document_bytes(
        "Hola, esto es una nota.".encode("utf-8"),
        filename="nota.txt",
        mimetype="text/plain",
        workdir=str(tmp_path),
        pipeline_runner=None,
        clock=lambda: 0,
    )

    assert payload["text"] == "Hola, esto es una nota."
    assert payload["text_source"] == "plain_text"


def test_pipeline_failure_still_returns_the_text(tmp_path):
    def broken(text):
        raise RuntimeError("model endpoint down")

    payload = dr.read_document_bytes(
        ("Escrito de alegaciones\n" * 5).encode("utf-8"),
        filename="escrito.txt",
        mimetype="text/plain",
        pipeline_runner=broken,
        workdir=str(tmp_path),
        clock=lambda: 0,
    )

    assert payload["success"] is True
    assert payload["review_required"] is True
    assert "model endpoint down" in payload["pipeline_error"]
    assert payload["text"].startswith("Escrito de alegaciones")


def test_oversized_document_is_refused(tmp_path):
    too_big = PDF_BYTES + b"0" * dr.MAX_DOCUMENT_BYTES

    with pytest.raises(dr.DocumentReaderError, match="over the"):
        dr.read_document_bytes(
            too_big,
            filename="enorme.pdf",
            mimetype="application/pdf",
            workdir=str(tmp_path),
            clock=lambda: 0,
        )


def test_the_budget_stops_a_long_scan(stub_blank_pdftotext, monkeypatch, tmp_path):
    ticks = iter([0, 0, 999])
    monkeypatch.setattr(dr, "render_pdf_pages", lambda *a, **k: [b"one", b"two"])
    work = tmp_path / "work"
    work.mkdir()

    with pytest.raises(dr.DocumentReaderError, match="budget"):
        dr.read_document_bytes(
            PDF_BYTES,
            filename="escaneo.pdf",
            mimetype="application/pdf",
            workdir=str(work),
            ocr_image=lambda image, mimetype: "texto",
            timeout=10,
            clock=lambda: next(ticks),
        )
    assert list(work.iterdir()) == []


def test_the_tool_is_advertised_with_the_documented_fields():
    import server

    tools = {tool["name"]: tool for tool in server.build_tools()}

    assert "read_document" in tools
    schema = tools["read_document"]["inputSchema"]
    assert schema["required"] == ["attachment_id"]
    assert "max_pages" in schema["properties"]
    assert "amount_total" in tools["read_document"]["description"]


def test_read_document_wiring_reads_the_attachment_it_was_given(
    stub_pdftotext, monkeypatch, tmp_path
):
    """The server method must hand the downloaded bytes to the reader, not a path."""
    import json

    import server

    monkeypatch.setenv("OCR_READ_WORKDIR", str(tmp_path))
    monkeypatch.setattr(
        server.OdooOCRSkill,
        "_download_attachment",
        lambda self, attachment_id: {
            "attachment_id": attachment_id,
            "name": "factura.pdf",
            "mimetype": "application/pdf",
            "data": PDF_BYTES,
        },
    )
    monkeypatch.setattr(
        server.OdooOCRSkill, "_pipeline_runner", lambda self: pipeline_over_real_parser
    )

    ocr = server.OdooOCRSkill()
    result = ocr.read_document(9, include_text=False)

    assert "isError" not in result
    payload = json.loads(result["content"])
    assert payload["attachment_id"] == 9
    assert payload["amount_total"] == 121.0
    assert "text" not in payload, "include_text=false must drop the text"


def test_read_document_wiring_returns_the_download_error(monkeypatch):
    import server

    monkeypatch.setattr(
        server.OdooOCRSkill,
        "_download_attachment",
        lambda self, attachment_id: {"isError": True, "content": "Attachment 9 not found"},
    )

    result = server.OdooOCRSkill().read_document(9)

    assert result["isError"] is True
    assert "not found" in result["content"]


def test_dispatch_reads_include_text_given_as_a_string(monkeypatch):
    import server

    seen = {}

    def fake_read_document(self, attachment_id, **kwargs):
        seen["attachment_id"] = attachment_id
        seen.update(kwargs)
        return {"content": "{}"}

    monkeypatch.setattr(server.OdooOCRSkill, "read_document", fake_read_document)

    response = server.handle_request(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "read_document",
                "arguments": {"attachment_id": 5, "include_text": "false", "max_pages": 2},
            },
        }
    )

    assert response["result"]["isError"] is False
    assert seen["attachment_id"] == 5
    assert seen["include_text"] is False
    assert seen["max_pages"] == 2
