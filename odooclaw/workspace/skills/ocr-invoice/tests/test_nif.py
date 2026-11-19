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
    # Ground-truth table (official REA table, verified against python-stdnum),
    # NOT the code's own _NIF_LETTER_TABLE — otherwise the test would be
    # circular and could never catch a wrong table.
    table = "TRWAGMYFPDXBNJZSQVHLCKE"
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


# --- NIF letter table: the rests 15-22 range the old table got wrong -------
#
# The historic table "TRWAGMYFPDXBNJZRVYSHKCLP" had 24 characters (an 'R'
# duplicated at index 15), so every NIF whose 8 digits land on remainder
# 15..22 mod 23 (~35% of real DNI numbers) were rejected, and symmetrically
# a wrong letter in that range was accepted. Both directions are exercised
# here. The expected letters below were derived independently from
# python-stdnum (the library Odoo itself uses to validate VAT), so this test
# is NOT circular: it does not read _NIF_LETTER_TABLE to compute the answer.

# 8-digit number whose value % 23 == rest, with the stdnum-correct letter.
_NIF_RESTS_15_TO_22 = {
    15: ("10000001", "S"),
    16: ("10000002", "Q"),
    17: ("10000003", "V"),
    18: ("10000004", "H"),
    19: ("10000005", "L"),
    20: ("10000006", "C"),
    21: ("10000007", "K"),
    22: ("10000008", "E"),
}


def test_regression_rest_15_valid_was_rejected_invalid_was_accepted():
    # Exact vectors from the T14 rejection verdict (12345679 % 23 == 15).
    # On the old table this test went red both ways:
    #   validate_nif("12345679S") -> False  (valid, wrongly rejected)
    #   validate_nif("12345679R") -> True   (invalid, wrongly accepted)
    assert validate_nif("12345679S") is True
    assert validate_nif("12345679R") is False


def test_valid_nif_rests_15_to_22_are_accepted():
    for rest, (digits, letter) in _NIF_RESTS_15_TO_22.items():
        assert validate_nif(digits + letter) is True, f"rest {rest}"


def test_nif_rests_15_to_22_reject_every_other_letter():
    for rest, (digits, correct) in _NIF_RESTS_15_TO_22.items():
        for wrong in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            if wrong == correct:
                continue
            assert validate_nif(digits + wrong) is False, f"rest {rest} accepted {wrong}"


def test_nif_table_matches_python_stdnum_across_all_remainders():
    # python-stdnum is an independent implementation of the NIF algorithm. If
    # _NIF_LETTER_TABLE drifts from it again, this fails — including for the
    # previously-broken rests 15..22. Skip gracefully if the oracle is absent.
    try:
        import stdnum.es.nif as stdnum_nif  # external oracle
    except ImportError:
        import unittest

        raise unittest.SkipTest("python-stdnum not installed (external oracle)")

    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for rest in range(23):
        number = 10_000_000
        while number % 23 != rest:
            number += 1
        valid = [ch for ch in letters if stdnum_nif.is_valid(f"{number}{ch}")]
        assert len(valid) == 1, f"rest {rest}: stdnum accepted {valid}"
        expected = valid[0]
        assert validate_nif(f"{number}{expected}") is True
        for wrong in letters:
            if wrong != expected:
                assert validate_nif(f"{number}{wrong}") is False, f"rest {rest}"
