"""The write-back to the document-intake queue is what makes criterion 2 true
end to end: a refused document waits in review with the reason, a created bill
points at the account.move. This pins that behaviour without a live Odoo by
mocking the single ORM door the skill already uses (``_odoo_call``).

A regression here is silent: the tool still answers the user, but the review
queue stays empty and nobody can see where the document went. So the sequence
of ``_odoo_call`` calls is asserted, not just the return value.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import OdooOCRSkill  # noqa: E402


def _make_skill():
    skill = OdooOCRSkill()
    skill.runtime_sender_id = 7  # a chat sender: the write-back must run as admin
    skill.runtime_rpc_context = {"company_id": 3}
    return skill


def _stub_calls(skill, search_result):
    """Return a fake ``_odoo_call`` that records every call and answers the
    intake search with ``search_result`` and everything else with success."""
    calls = []

    def fake(model, method, args=None, kwargs=None):
        args = args or []
        kwargs = kwargs or {}
        calls.append((model, method, args, kwargs))
        if model == "odooclaw.document.intake" and method == "search_read":
            return {"result": search_result}
        # mark_created / mark_review succeed.
        return {"result": True}

    skill._odoo_call = fake
    return calls


def test_mark_created_records_the_bill_on_success():
    skill = _make_skill()
    calls = _stub_calls(skill, [{"id": 5, "state": "new"}])

    skill._report_intake_outcome(
        101, created_model="account.move", created_res_id=42
    )

    intake_calls = [c for c in calls if c[0] == "odooclaw.document.intake"]
    read = [c for c in intake_calls if c[1] == "search_read"]
    created = [c for c in intake_calls if c[1] == "mark_created"]
    assert read, "the queue must be queried first"
    assert created, "mark_created must be called on success"
    assert created[0][2] == [5]
    assert created[0][3] == {"created_model": "account.move", "created_res_id": 42}


def test_mark_review_records_the_reason_on_refusal():
    skill = _make_skill()
    calls = _stub_calls(skill, [{"id": 5, "state": "new"}])

    skill._report_intake_outcome(
        102, reason="vat: NIF/CIF with invalid control digit (B12345678)"
    )

    review = [
        c for c in calls if c[0] == "odooclaw.document.intake" and c[1] == "mark_review"
    ]
    assert review, "mark_review must be called on refusal"
    assert review[0][2] == [5]
    assert review[0][3]["reason"] == "vat: NIF/CIF with invalid control digit (B12345678)"


def test_absent_intake_record_is_a_silent_noop():
    skill = _make_skill()
    calls = _stub_calls(skill, [])  # the document was never declared

    skill._report_intake_outcome(103, created_model="account.move", created_res_id=43)

    assert not [c for c in calls if c[1] in ("mark_created", "mark_review")], (
        "nothing is written when the intake row is absent"
    )


def test_disabled_document_is_not_reported_as_created():
    skill = _make_skill()
    calls = _stub_calls(skill, [{"id": 5, "state": "disabled"}])

    skill._report_intake_outcome(104, created_model="account.move", created_res_id=44)

    assert not [c for c in calls if c[1] in ("mark_created", "mark_review")], (
        "a document the customer switched off must not be reported as created"
    )


def test_a_failed_writeback_never_raises():
    skill = _make_skill()

    def boom(model, method, args=None, kwargs=None):
        raise RuntimeError("Odoo down")

    skill._odoo_call = boom
    # Must not propagate: the outcome is already delivered to the user.
    skill._report_intake_outcome(105, created_model="account.move", created_res_id=45)


def test_sender_and_context_are_restored_after_writeback():
    skill = _make_skill()
    _stub_calls(skill, [{"id": 5, "state": "new"}])

    skill._report_intake_outcome(106, created_model="account.move", created_res_id=46)

    assert skill.runtime_sender_id == 7, "the chat sender must be restored"
    assert skill.runtime_rpc_context == {"company_id": 3}, "the context must be restored"
