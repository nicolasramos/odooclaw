"""Hard NIF validator: a Spanish fiscal id is valid only when its control
digit/letter matches. This is deterministic and model-independent, so a
vision/LLM model can never manufacture a valid NIF out of a malformed one.

Ground truth for the control-digit algorithm comes from the ``validate-cif``
library (``isValid('A58818501') => true``): the 7 data digits get the
odd-position-×2 weighting and the control is ``(10 - sum % 10) % 10``.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline import validate_nif  # noqa: E402


def test_valid_person_nif_letter():
    # 12345678 % 23 -> index 14 of the table -> 'Z'
    assert validate_nif("12345678Z") is True


def test_valid_company_cif_control_digit():
    # Ground-truth vector from the validate-cif library README.
    assert validate_nif("A58818501") is True
    assert validate_nif("B12345674") is True


def test_nif_with_invalid_control_letter_is_rejected():
    assert validate_nif("12345678A") is False


def test_cif_with_invalid_control_digit_is_rejected():
    # The repo's historic test vector: B12345678 looks plausible but its
    # control digit should be 4, not 8. A hard validator must catch it even
    # if a model reports 0.99 confidence.
    assert validate_nif("B12345678") is False


def test_nie_valid_and_invalid():
    table = "TRWAGMYFPDXBNJZRVYSHKCLP"
    # X + 1234567 -> (0*10_000_000 + 1234567) % 23 -> table letter
    assert validate_nif("X1234567" + table[1234567 % 23]) is True
    assert validate_nif("X1234567A") is False


def test_malformed_ids_are_never_valid():
    for bad in ("", "   ", "B123", "123456789", "ABCDEFGHI", "B1234567X", "B12 34 567"):
        assert validate_nif(bad) is False, bad


def test_whitespace_and_case_are_normalised():
    assert validate_nif("  b12345674 ") is True
    assert validate_nif("b12345674") is True


# --- Hard-validator integration into layer 4 ------------------------------

def _fiscal(total=242.0, tax=42.0, found=True):
    return {
        "fiscal_lines": [],
        "amount_total": total,
        "amount_subtotal": total - tax,
        "amount_tax": tax,
        "invoice_number": "F-2026-0042",
        "fiscal_found": found,
        "is_reverse_charge": False,
    }


def test_invalid_nif_forces_review_even_with_good_amounts():
    from pipeline import layer4_validate

    header = {"partner_name": "Proueba SL", "vat": "B12345678"}  # invalid control
    ok, issues, merged = layer4_validate(header, _fiscal())
    assert ok is False
    assert any("NIF" in i or "CIF" in i for i in issues)
    # The model's confidence never overrides the hard validator.
    assert merged["_field_confidence"]["vat"]["confidence"] == 0.0


def test_valid_nif_stays_ok():
    from pipeline import layer4_validate

    header = {"partner_name": "Proueba SL", "vat": "B12345674"}  # valid control
    ok, issues, merged = layer4_validate(header, _fiscal())
    assert ok is True
    assert not any("NIF" in i or "CIF" in i for i in issues)


def test_missing_nif_is_not_an_error():
    from pipeline import layer4_validate

    header = {"partner_name": "Proueba SL", "vat": ""}
    ok, _issues, _merged = layer4_validate(header, _fiscal())
    assert ok is True


# --- Per-field confidence -------------------------------------------------

def test_field_confidence_records_value_confidence_and_provenance():
    from pipeline import layer4_validate

    header = {"partner_name": "Proueba SL", "vat": "B12345674"}
    _ok, _issues, merged = layer4_validate(header, _fiscal())
    conf = merged["_field_confidence"]
    assert conf["vat"] == {
        "value": "B12345674", "confidence": 1.0, "provenance": "deterministic",
    }
    # A total read off the fiscal summary is high-confidence and labeled as such.
    assert conf["amount_total"]["provenance"] == "fiscal_summary"
    assert conf["amount_total"]["confidence"] == 0.95


def test_unread_vat_leaves_no_field_confidence_entry():
    from pipeline import layer4_validate

    header = {"partner_name": "Proueba SL", "vat": ""}
    _ok, _issues, merged = layer4_validate(header, _fiscal())
    assert "vat" not in merged["_field_confidence"]
