"""T7 criterion tests: creating a draft expense from an expense ticket.

Criterion (a): a clean ticket produces a draft ``hr.expense`` with date, total,
a proposed category and the original document linked, and the intake row is
marked created. Criterion (b): an illegible document creates nothing and the
intake row waits in review with the reason.

Everything runs without a live Odoo: the single ORM door (``_odoo_call``) is
stubbed and the sequence of calls is asserted, because a silent regression here
means documents vanishing from the review queue while the chat reply still looks
fine. The expense path mirrors the vendor bill path (test_vendor_bill_creation)
so the two stay in lockstep.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import OdooOCRSkill  # noqa: E402

# A clean taxi ticket: amounts, no supplier VAT (so the classifier reads it as
# an expense ticket). "Taxi Metro SL" maps to the "Transporte" expense category.
TICKET = {
    "partner_name": "Taxi Metro SL",
    "invoice_date": "2026-11-10",
    "amount_total": 28.70,
    "validation_ok": True,
    "validation_issues": [],
}

# Same ticket but with no total read: the hard gate (importe) must refuse it.
NO_TOTAL_TICKET = {
    "partner_name": "Taxi Metro SL",
    "invoice_date": "2026-11-10",
    "validation_ok": True,
    "validation_issues": [],
}

# A legible ticket whose merchant matches no category keyword: the category is
# left empty (proposed, not invented).
NO_CATEGORY_TICKET = {
    "partner_name": "Librería Central SL",
    "invoice_date": "2026-11-10",
    "amount_total": 15.0,
    "validation_ok": True,
    "validation_issues": [],
}


def _make_skill():
    skill = OdooOCRSkill()
    skill.runtime_sender_id = 7
    skill.runtime_rpc_context = {"company_id": 3}
    skill._download_attachment = lambda attachment_id: {
        "id": attachment_id,
        "name": "ticket.pdf",
        "data": b"%PDF-1.4 fake ticket",
    }
    return skill


def _stub_odoo(skill):
    """Fake ORM door: records every call and answers each RPC the expense path
    makes with a plausible id, exactly like test_vendor_bill_creation does."""
    calls = []

    def fake(model, method, args=None, kwargs=None):
        calls.append((model, method, args or [], kwargs or {}))
        if model == "odooclaw.document.intake" and method == "search_read":
            return {"result": [{"id": 5, "state": "new"}]}
        if model == "hr.expense" and method == "fields_get":
            return {
                "result": {
                    "name": {"string": "Name"},
                    "employee_id": {"string": "Employee"},
                    "product_id": {"string": "Product"},
                    "date": {"string": "Date"},
                    "total_amount": {"string": "Total"},
                    "currency_id": {"string": "Currency"},
                    "category_id": {"string": "Category"},
                    "description": {"string": "Description"},
                    "payment_mode": {
                        "string": "Payment",
                        "selection": [["own_account", "Own account"]],
                    },
                }
            }
        if model == "hr.expense" and method == "create":
            return {"result": 900}
        if model == "hr.expense" and method == "message_post":
            return {"result": None}
        if model == "hr.employee" and method == "search_read":
            return {"result": [{"id": 77}]}
        if model == "hr.expense.category" and method == "search_read":
            return {"result": [{"id": 20, "name": "Transporte"}]}
        if model == "product.product" and method == "search_read":
            return {"result": [{"id": 50}]}
        if model == "res.currency" and method == "search_read":
            return {"result": [{"id": 1}]}
        if model == "ir.attachment" and method == "create":
            return {"result": 901}
        return {"result": True}

    skill._odoo_call = fake
    return calls


def _stub_extract(skill, invoice_data=TICKET, error=None):
    """Pin the extraction result the creation path will see."""
    if error is not None:
        skill.extract_invoice = lambda *a, **k: {
            "isError": True,
            "content": error,
        }
        return
    skill.extract_invoice = lambda *a, **k: {
        "content": json.dumps({"success": True, "invoice_data": invoice_data})
    }


def _intake_calls(calls, method):
    return [c for c in calls if c[0] == "odooclaw.document.intake" and c[1] == method]


def test_clean_ticket_creates_draft_expense_with_category_and_attachment():
    """Criterion (a): date, total, proposed category, draft state, linked file."""
    skill = _make_skill()
    calls = _stub_odoo(skill)
    _stub_extract(skill)

    res = skill.extract_and_create_employee_expense(101, sender_id=7)

    assert not res.get("isError"), res
    payload = json.loads(res["content"])
    assert payload["success"] is True
    assert payload["expense_id"] == 900

    expense_create = [c for c in calls if c[0] == "hr.expense" and c[1] == "create"]
    assert expense_create, "a clean ticket must create an hr.expense"
    vals = expense_create[0][2][0]
    # D3: creation never posts the expense; it stays a draft.
    assert not any(m == "action_submit" for (_, m, _, _) in calls)
    assert vals["date"] == "2026-11-10"
    assert vals["total_amount"] == 28.70
    # Category proposed from the merchant (Taxi -> Transporte) and resolved
    # read-only to the existing category id.
    assert vals["category_id"] == 20
    assert vals["employee_id"] == 77

    attach = [
        c
        for c in calls
        if c[0] == "ir.attachment"
        and c[2][0].get("res_id") == 900
    ]
    assert attach, "the original document must be linked to the expense"

    created = _intake_calls(calls, "mark_created")
    assert created and created[0][3] == {
        "created_model": "hr.expense",
        "created_res_id": 900,
    }


def test_illegible_ticket_creates_nothing_and_goes_to_review():
    """Criterion (b): extraction failure must NOT create an expense and must
    leave the document in the review queue with the reason."""
    skill = _make_skill()
    calls = _stub_odoo(skill)
    _stub_extract(skill, error="No text layer and no OCR engine available")

    res = skill.extract_and_create_employee_expense(102, sender_id=7)

    assert res.get("isError"), "the user must still be told it failed"
    assert not any(
        c[0] == "hr.expense" and c[1] == "create" for c in calls
    ), "an illegible ticket must never create an expense"
    review = _intake_calls(calls, "mark_review")
    assert review, "the document must wait in the review queue"
    assert "No text layer" in review[0][3]["reason"]
    assert not _intake_calls(calls, "mark_created")


def test_ticket_without_total_goes_to_review_not_created():
    """Hard gate (importe): no total, no expense — even with everything else read."""
    skill = _make_skill()
    calls = _stub_odoo(skill)
    _stub_extract(skill, NO_TOTAL_TICKET)

    res = skill.extract_and_create_employee_expense(103, sender_id=7)

    assert res.get("isError")
    assert not any(
        c[0] == "hr.expense" and c[1] == "create" for c in calls
    ), "a ticket without total must never create an expense"
    review = _intake_calls(calls, "mark_review")
    assert review and "No total" in review[0][3]["reason"]


def test_category_left_empty_when_no_category_matches():
    """The category is a proposal, not an invention: no matching category means
    the field is left empty rather than a made-up one being written."""
    skill = _make_skill()
    calls = _stub_odoo(skill)
    _stub_extract(skill, NO_CATEGORY_TICKET)

    skill.extract_and_create_employee_expense(104, sender_id=7)

    expense_create = [c for c in calls if c[0] == "hr.expense" and c[1] == "create"]
    assert expense_create, "a legible ticket still creates an expense"
    vals = expense_create[0][2][0]
    assert "category_id" not in vals, "no matching category must leave the field empty"
    # And no category was invented via a lookup either.
    cat_lookups = [
        c for c in calls if c[0] == "hr.expense.category" and c[1] == "search_read"
    ]
    assert cat_lookups == [], "no category lookup when nothing is proposed"


def test_creation_failure_sends_document_to_review():
    """If the expense cannot be written (partner/RPC error), the document must
    not vanish: it waits in review with the reason."""
    skill = _make_skill()
    calls = _stub_odoo(skill)

    skill_real = skill._odoo_call

    def failing(model, method, args=None, kwargs=None):
        if model == "hr.expense" and method == "create":
            return {"isError": True, "content": "access denied"}
        return skill_real(model, method, args or [], kwargs or {})

    skill._odoo_call = failing
    _stub_extract(skill)

    res = skill.extract_and_create_employee_expense(105, sender_id=7)

    assert res.get("isError")
    review = _intake_calls(calls, "mark_review")
    assert review, "a failed creation must leave the document in review"
    assert not _intake_calls(calls, "mark_created")


def test_dry_run_extracts_without_creating_or_reporting():
    """dry_run only extracts and normalizes: no expense, no intake write-back."""
    skill = _make_skill()
    calls = _stub_odoo(skill)
    _stub_extract(skill)

    res = skill.extract_and_create_employee_expense(106, sender_id=7, dry_run=True)

    payload = json.loads(res["content"])
    assert payload["dry_run"] is True
    assert not any(c[0] == "hr.expense" and c[1] == "create" for c in calls)
    assert not _intake_calls(calls, "mark_created")
    assert not _intake_calls(calls, "mark_review")
