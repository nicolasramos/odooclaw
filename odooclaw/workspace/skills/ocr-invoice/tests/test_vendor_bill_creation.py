"""T6 criterion tests: creating a draft vendor bill from a purchase document.

Criterion (a): a clean invoice produces a draft ``account.move`` with lines,
vendor, date, taxes and the original document linked, and the intake row is
marked created. Criterion (b): an illegible document creates nothing and the
intake row waits in the review queue with the reason.

Everything runs without a live Odoo: the single ORM door (``_odoo_call``) is
stubbed and the sequence of calls is asserted, because a silent regression
here means documents vanishing from the review queue while the chat reply
still looks fine.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import OdooOCRSkill  # noqa: E402

# B12345678 is a well-formed Spanish CIF: control digit verified by validate_nif.
CLEAN_INVOICE = {
    "partner_name": "Papelería Ejemplo SL",
    "partner_vat": "B12345678",
    "invoice_date": "2026-11-01",
    "ref": "FAC-2026-001",
    "currency": "EUR",
    "amount_total": 121.0,
    "amount_untaxed": 100.0,
    "amount_tax": 21.0,
    "validation_ok": True,
    "validation_issues": [],
    "invoice_line_ids": [
        {"name": "Papel A4", "quantity": 10, "price_unit": 10.0, "tax_percentage": 21}
    ],
}


def _make_skill():
    skill = OdooOCRSkill()
    skill.runtime_sender_id = 7
    skill.runtime_rpc_context = {"company_id": 3}
    # The attachment download is not under test; give every path a real payload.
    skill._download_attachment = lambda attachment_id: {
        "attachment_id": attachment_id,
        "name": "invoice.pdf",
        "mimetype": "application/pdf",
        "data": b"%PDF-1.4 fake",
    }
    return skill


def _stub_odoo(skill):
    """Fake ORM door: records every call and answers each RPC the creation
    path makes with a plausible id, exactly like test_intake_writeback does."""
    calls = []

    def fake(model, method, args=None, kwargs=None):
        args = args or []
        kwargs = kwargs or {}
        calls.append((model, method, args, kwargs))
        if model == "odooclaw.document.intake" and method == "search_read":
            return {"result": [{"id": 5, "state": "new"}]}
        if model == "res.partner" and method == "search_read":
            return {"result": [{"id": 77}]}
        if model == "account.account" and method == "search_read":
            return {"result": [{"id": 300}]}
        if model == "account.tax" and method == "search_read":
            return {"result": [{"id": 40}]}
        if model == "res.currency" and method == "search_read":
            return {"result": [{"id": 1}]}
        if model == "account.move" and method == "create":
            return {"result": 900}
        if model == "ir.attachment" and method == "create":
            return {"result": 901}
        return {"result": True}

    skill._odoo_call = fake
    return calls


def _stub_extract(skill, invoice_data=None, error=None):
    """Pin the extraction result the creation path will see."""
    if error is not None:
        skill.extract_invoice = lambda *a, **k: {"isError": True, "content": error}
        return
    skill.extract_invoice = lambda *a, **k: {
        "content": json.dumps(
            {"success": True, "invoice_data": invoice_data or CLEAN_INVOICE},
            ensure_ascii=False,
        )
    }


def _intake_calls(calls, method):
    return [c for c in calls if c[0] == "odooclaw.document.intake" and c[1] == method]


def test_clean_invoice_creates_draft_bill_with_everything():
    """Criterion (a): lines, vendor, date, taxes, draft state, attachment."""
    skill = _make_skill()
    calls = _stub_odoo(skill)
    _stub_extract(skill)

    res = skill.extract_and_create_vendor_bill(101)

    assert not res.get("isError"), res
    payload = json.loads(res["content"])
    assert payload["success"] is True
    assert payload["move_id"] == 900

    move_create = [
        c for c in calls if c[0] == "account.move" and c[1] == "create"
    ]
    assert move_create, "a clean invoice must create an account.move"
    vals = move_create[0][2][0]
    assert vals["move_type"] == "in_invoice"
    # D3: creation never posts — no action_post may ever be called.
    assert not any(m == "action_post" for (_, m, _, _) in calls)
    assert vals["partner_id"] == 77
    assert vals["invoice_date"] == "2026-11-01"
    line = vals["invoice_line_ids"][0][2]
    assert line["name"] == "Papel A4"
    assert line["price_unit"] == 10.0
    assert line["tax_ids"] == [[6, 0, [40]]], "the 21% purchase tax must be on the line"

    attach = [
        c
        for c in calls
        if c[0] == "ir.attachment" and c[1] == "create"
        and c[2][0].get("res_model") == "account.move"
        and c[2][0].get("res_id") == 900
    ]
    assert attach, "the original document must be linked to the bill"

    created = _intake_calls(calls, "mark_created")
    assert created and created[0][3] == {
        "created_model": "account.move",
        "created_res_id": 900,
    }


def test_illegible_document_creates_nothing_and_goes_to_review():
    """Criterion (b): extraction failure (no text layer, OCR/vision dead) must
    NOT create a bill and must leave the document in the review queue."""
    skill = _make_skill()
    calls = _stub_odoo(skill)
    _stub_extract(skill, error="No text layer and no OCR engine available")

    res = skill.extract_and_create_vendor_bill(102)

    assert res.get("isError"), "the user must still be told it failed"
    assert not any(
        c[0] == "account.move" and c[1] == "create" for c in calls
    ), "an illegible document must never create a bill"
    review = _intake_calls(calls, "mark_review")
    assert review, "the document must wait in the review queue"
    assert "No text layer" in review[0][3]["reason"]
    assert not _intake_calls(calls, "mark_created")


def test_missing_nif_goes_to_review_not_created():
    """Hard gate: no NIF, no bill — even with a perfect total and ok=True."""
    skill = _make_skill()
    calls = _stub_odoo(skill)
    no_nif = dict(CLEAN_INVOICE)
    no_nif["partner_vat"] = ""
    _stub_extract(skill, no_nif)

    res = skill.extract_and_create_vendor_bill(103)

    assert res.get("isError")
    assert not any(
        c[0] == "account.move" and c[1] == "create" for c in calls
    ), "a bill without NIF must not be created"
    review = _intake_calls(calls, "mark_review")
    assert review and "NIF" in review[0][3]["reason"]


def test_invalid_nif_goes_to_review_not_created():
    """Hard gate (defense in depth at the creation boundary): a NIF whose
    control digit fails never books, whatever the model says."""
    skill = _make_skill()
    calls = _stub_odoo(skill)
    bad_nif = dict(CLEAN_INVOICE)
    bad_nif["partner_vat"] = "B12345670"  # wrong control digit
    bad_nif["validation_ok"] = False
    bad_nif["validation_issues"] = ["vat: NIF/CIF with invalid control digit (B12345670)"]
    _stub_extract(skill, bad_nif)

    res = skill.extract_and_create_vendor_bill(104)

    assert res.get("isError")
    assert not any(c[0] == "account.move" and c[1] == "create" for c in calls)
    review = _intake_calls(calls, "mark_review")
    assert review and "control digit" in review[0][3]["reason"]


def test_creation_failure_sends_document_to_review():
    """If the bill cannot be written (partner/RPC error), the document must
    not vanish: it waits in review with the reason."""
    skill = _make_skill()
    calls = _stub_odoo(skill)

    def failing(model, method, args=None, kwargs=None):
        if model == "res.partner" and method == "search_read":
            return {"result": []}
        if model == "res.partner" and method == "create":
            return {"isError": True, "content": "access denied"}
        return skill_real(model, method, args or [], kwargs or {})

    skill_real = skill._odoo_call
    skill._odoo_call = failing
    _stub_extract(skill)

    res = skill.extract_and_create_vendor_bill(105)

    assert res.get("isError")
    assert not any(
        c[0] == "account.move" and c[1] == "create" for c in calls
    ), "account.move must never be attempted when the partner fails"
    review = _intake_calls(calls, "mark_review")
    assert review, "a failed creation must leave the document in review"
    assert not _intake_calls(calls, "mark_created")
