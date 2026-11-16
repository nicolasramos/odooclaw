"""T5 · NRA-5525 — document type classification.

The classifier must decide invoice / expense ticket / business card / unknown
BEFORE extracting amounts, and it must do so DETERMINISTICALLY for the clear
cases. The layer-3 LLM is only consulted when the signals conflict.

The acceptance criterion is "three documents of each type classify correctly
without invoking the layer-3 model in the unambiguous cases". Three real
documents of each type are used below. The real client corpus (T1) is not
available yet, so these are representative documents that stand in for it; the
rate measured against them is a stand-in and the real-corpus rate is declared
pending, never presented as a client-corpus measure.

The model call is isolated in ``_classify_document_type_llm`` so a spy can
detect whether it was reached for a clear-cut document.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pipeline  # noqa: E402
from pipeline import classify_document_type  # noqa: E402


def doc(*lines):
    """Build a document from its lines (avoids nested triple-quotes)."""
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Representative documents (real client corpus pending — see module docstring).
# ---------------------------------------------------------------------------

INVOICES = [
    doc(
        "Suministros Prueba SL",
        "CIF: B12345678",
        "Factura nº: F-2026-0042",
        "Fecha: 03/11/2026",
        "",
        "Descripcion  Cantidad  Precio  Importe",
        "Servicio de prueba  2  100,00  200,00",
        "",
        "Base imponible: 200,00",
        "IVA 21%: 42,00",
        "Total: 242,00",
    ),
    doc(
        "Consultores Digital SL",
        "NIF: A12345678",
        "Invoice No: INV-2026-1187",
        "Date: 15/10/2026",
        "",
        "Subtotal: 500,00",
        "IVA 10%: 50,00",
        "Total: 550,00",
    ),
    doc(
        "Grupo Tecnico Barcelona",
        "B08765432",
        "Factura: FRA-2026/0412",
        "Fecha de emision: 01/02/2026",
        "",
        "Base al 21%: 1200,00",
        "IVA 21%: 252,00",
        "Total: 1452,00",
    ),
]

TICKETS = [
    doc(
        "Taxi Metro SL",
        "Reservacion 4521",
        "Fecha 12/05/2026",
        "Origen: Aeropuerto Barajas",
        "Destino: Centro",
        "TOTAL: 28,70",
    ),
    doc(
        "Supermercado El Sol",
        "Ticket 8821",
        "12/06/2026",
        "Leche 2x1,10",
        "Pan integral 1,40",
        "TOTAL: 3,60",
    ),
    doc(
        "Restaurante La Plaza",
        "Calle Real 12",
        "Total 42,00",
        "IVA incluido",
    ),
]

CARDS = [
    doc(
        "Maria Lopez Hernandez",
        "Directora de Marketing",
        "Empresa Innovacion SL",
        "maria.lopez@innovacion.es",
        "Tel: +34 91 123 45 67",
        "www.innovacion.es",
    ),
    doc(
        "Juan Perez Rodriguez",
        "Ingeniero de Software",
        "Telefono: 600 123 456",
        "Avda. de la Constitucion 3, Sevilla",
    ),
    doc(
        "Carlos Ruiz",
        "Gerente General",
        "Movil: +34 622 33 44 55",
        "contacto@empresa-nueva.com",
    ),
]

# Ambiguous: amounts present but no supplier VAT, yet an invoice reference is
# present — an invoice whose CIF was not read. The model must disambiguate.
AMBIGUOUS_INVOICE = doc(
    "Factura nº F-2026-9999",
    "Fecha: 05/07/2026",
    "Concepto: asesoria contable",
    "Total: 300,00",
)


def _spy_factory(collected):
    """Return a replacement for ``_classify_document_type_llm`` that records
    every call and raises, so a clear-cut document cannot silently reach it."""

    def _spy(cfg, text):
        collected.append(text)
        raise AssertionError("layer-3 model must not be called for a clear document")

    return _spy


# ---------------------------------------------------------------------------
# Clear cases: deterministic, model never called.
# ---------------------------------------------------------------------------

def test_invoices_classify_deterministically(monkeypatch):
    calls = []
    monkeypatch.setattr(pipeline, "_classify_document_type_llm", _spy_factory(calls))
    for text in INVOICES:
        result = classify_document_type(text)
        assert result.type == "invoice", text
        assert result.source == "deterministic", text
    assert calls == []


def test_tickets_classify_deterministically(monkeypatch):
    calls = []
    monkeypatch.setattr(pipeline, "_classify_document_type_llm", _spy_factory(calls))
    for text in TICKETS:
        result = classify_document_type(text)
        assert result.type == "expense", text
        assert result.source == "deterministic", text
    assert calls == []


def test_cards_classify_deterministically(monkeypatch):
    calls = []
    monkeypatch.setattr(pipeline, "_classify_document_type_llm", _spy_factory(calls))
    for text in CARDS:
        result = classify_document_type(text)
        assert result.type == "contact", text
        assert result.source == "deterministic", text
    assert calls == []


# ---------------------------------------------------------------------------
# Ambiguous case: the model is consulted, and it fails closed.
# ---------------------------------------------------------------------------

def test_ambiguous_defers_to_the_model(monkeypatch):
    calls = []
    monkeypatch.setattr(
        pipeline, "_classify_document_type_llm",
        lambda cfg, text: calls.append(text) or "invoice",
    )
    result = classify_document_type(AMBIGUOUS_INVOICE)
    assert result.type == "invoice"
    assert result.source == "model"
    assert len(calls) == 1


def test_model_failure_fails_closed(monkeypatch):
    def _boom(cfg, text):
        raise RuntimeError("layer-3 endpoint down")

    monkeypatch.setattr(pipeline, "_classify_document_type_llm", _boom)
    result = classify_document_type(AMBIGUOUS_INVOICE)
    # Model unavailable: degrade to a deterministic best effort, never lose it.
    assert result.source == "model-unavailable"
    assert result.type == "invoice"


def test_empty_document_is_unknown():
    result = classify_document_type("")
    assert result.type == "unknown"
    assert result.source == "deterministic"


# ---------------------------------------------------------------------------
# Integration: the pipeline output carries the classification.
# ---------------------------------------------------------------------------

def test_pipeline_output_carries_document_type(monkeypatch):
    """The orchestrator tags the merged result with the document type."""

    def _fake_header(cfg, text):
        return {"partner_name": "Suministros Prueba SL", "vat": "B12345678"}

    monkeypatch.setattr(pipeline, "layer3_header", _fake_header)
    merged = pipeline.run_pipeline_from_text(INVOICES[0])
    assert merged["document_type"] == "invoice"
    assert merged["classification_source"] == "deterministic"
