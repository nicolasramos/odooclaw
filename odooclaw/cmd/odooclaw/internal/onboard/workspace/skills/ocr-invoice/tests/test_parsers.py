"""Deterministic layers must read the numbers off the document, not guess them.

The text below is the real text layer of an Odoo 18 customer invoice
(INV/2026/00001): labels and values land on separate lines with the currency
symbol alone, which is exactly what broke the old last-match-wins scan.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline import (  # noqa: E402
    _parse_invoice_number,
    _parse_subtotal,
    _parse_total,
    layer2_fiscal,
)

ODOO_TEXT = """Untaxed Amount
$
100.00
Tax 15%
$
15.00
Total
$
115.00
Cliente Prueba Bot
Invoice

INV/2026/00001
Invoice Date
11/02/2026
Due Date
11/02/2026
Source
S00003
Description
Quantity
Unit Price
Taxes
Amount
Silla Prueba
1.00
100.00
15%
$
100.00
Payment Communication:
INV/2026/00001
My Company
United States
"""


def test_total_is_the_labeled_total_not_the_untaxed_amount():
    assert _parse_total(ODOO_TEXT) == 115.0


def test_subtotal_reads_the_english_label():
    assert _parse_subtotal(ODOO_TEXT) == 100.0


def test_invoice_number_by_shape():
    assert _parse_invoice_number(ODOO_TEXT) == "INV/2026/00001"


def test_fiscal_block_carries_number_and_subtotal():
    fiscal = layer2_fiscal(ODOO_TEXT)
    assert fiscal["amount_total"] == 115.0
    assert fiscal["amount_subtotal"] == 100.0
    assert fiscal["invoice_number"] == "INV/2026/00001"
    assert fiscal["amount_tax"] == 15.0
