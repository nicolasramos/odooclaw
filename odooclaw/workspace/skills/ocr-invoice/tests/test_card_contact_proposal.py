"""T8 criterion tests: a business card becomes a PROPOSAL, never a write.

Criterion (a): a clean card produces a proposal carrying only the fields really
read, and nothing is written to Odoo (D4). Criterion (b): when the email/NIF/
name+company already exists as a contact, the proposal is to ENRICH that existing
contact, not to create a second one. An illegible card creates nothing and waits
in the review queue with the reason.

Everything runs without a live Odoo: the single ORM door (``_odoo_call``) and the
vision extractor (``_call_vision_contact``) are stubbed, and the sequence of ORM
calls is asserted, because a silent regression here means either a duplicated
contact or a document vanishing from the review queue while the chat reply looks
fine. This path mirrors the expense criterion tests (test_employee_expense_
creation) so create/enrich/illegible stay in lockstep across the chain.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import OdooOCRSkill  # noqa: E402

# A clean business card: the fields the vision extractor would return.
CARD = {
    "name": "Juan Pérez",
    "company": "Innovación Digital SL",
    "position": "CTO",
    "email": "juan@empresa.com",
    "phone": "+34 91 123 45 67",
    "mobile": "+34 600 11 22 33",
    "web": "https://empresa.com",
    "address": "Calle Gran Vía 1, Madrid",
    "vat": "B12345678",
}

# Same card minus the fields we only want read when they are actually there.
CARD_PARTIAL = {
    "name": "María López",
    "email": "maria@nocorp.com",
}


def _make_skill():
    skill = OdooOCRSkill()
    skill.runtime_sender_id = 7
    skill.runtime_rpc_context = {"company_id": 3}
    skill._download_attachment = lambda attachment_id: {
        "id": attachment_id,
        "name": "card.png",
        "mimetype": "image/png",
        "data": b"\x89PNG fake card",
    }
    return skill


def _stub_vision(skill, card=CARD, raw_text=None, error=None):
    """Pin what the vision extractor returns for the card."""
    if error is not None:
        skill._call_vision_contact = lambda attachment: {
            "isError": True,
            "content": error,
        }
        return
    raw = raw_text if raw_text is not None else "Juan Pérez, CTO, Innovación Digital SL, juan@empresa.com, +34 600 11 22 33"

    def fake(attachment):
        return {"parsed": card, "raw_text": raw}

    skill._call_vision_contact = fake


def _stub_odoo(skill, existing=None, match_by=None):
    """Fake ORM door. ``match_by`` picks which dedupe key resolves to an existing
    contact (``'vat'`` | ``'email'`` | ``'name_company'`` | ``None``). Every call
    is recorded so the tests can assert the exact ORM sequence."""
    calls = []
    existing = existing or {
        "id": 42,
        "name": "Juan Pérez",
        "email": "juan@empresa.com",
        "vat": "",
        "phone": "",
        "mobile": "",
        "website": "",
        "street": "",
        "company_type": "person",
    }

    def fake(model, method, args=None, kwargs=None):
        calls.append((model, method, args or [], kwargs or {}))
        if model == "odooclaw.document.intake" and method == "search_read":
            return {"result": [{"id": 5, "state": "new"}]}
        if model == "res.partner" and method == "search_read":
            domain = (args or [[]])[0]
            first = domain[0] if domain else None
            field = first[0] if isinstance(first, (list, tuple)) else None
            # A name+company dedupe carries a 3-element AND domain; a bare name
            # lookup carries one. Only the exact key requested may resolve.
            if match_by == "vat" and field == "vat":
                return {"result": [existing]}
            if match_by == "email" and field == "email":
                return {"result": [existing]}
            if match_by == "name_company" and field == "name" and len(domain) == 3:
                return {"result": [existing]}
            return {"result": []}
        return {"result": True}

    skill._odoo_call = fake
    return calls


def _intake_calls(calls, method):
    return [c for c in calls if c[0] == "odooclaw.document.intake" and c[1] == method]


def _partner_lookups(calls):
    return [c for c in calls if c[0] == "res.partner" and c[1] == "search_read"]


def _partner_created(calls):
    return any(c[0] == "res.partner" and c[1] == "create" for c in calls)


def test_clean_card_proposes_create_without_writing_anything():
    """Criterion (a): a card with no existing match yields a create proposal,
    contacts are never created, and the intake queue records the pending review."""
    skill = _make_skill()
    calls = _stub_odoo(skill, match_by=None)
    _stub_vision(skill)

    res = skill.extract_and_propose_contact(1, dry_run=False)

    assert not res.get("isError"), res
    payload = json.loads(res["content"])
    assert payload["success"] is True
    assert payload["status"] == "create_new"
    assert payload["existing_partner_id"] is None
    assert payload["contact"]["email"] == "juan@empresa.com"
    assert "ENRICH" not in payload["message"]

    # D4: a proposal never writes a contact, whatever the extraction says.
    assert _partner_created(calls) is False

    # The document is declared in the queue awaiting human confirmation.
    review = _intake_calls(calls, "mark_review")
    assert review, "a proposal must be declared in the review queue"
    assert not _intake_calls(calls, "mark_created")


def test_existing_email_enriches_instead_of_duplicating():
    """Criterion (b): an email that already exists resolves to that contact and
    the proposal is to enrich it — a second contact is never created."""
    skill = _make_skill()
    calls = _stub_odoo(skill, match_by="email")
    _stub_vision(skill)

    res = skill.extract_and_propose_contact(2)

    payload = json.loads(res["content"])
    assert payload["status"] == "enrich_existing"
    assert payload["existing_partner_id"] == 42
    assert "ENRICH" in payload["message"]
    assert _partner_created(calls) is False, "an existing email must never create a second contact"

    # Dedupe resolved on the email lookup; nothing else about the contact changed.
    enrich_review = _intake_calls(calls, "mark_review")
    assert enrich_review and "ENRICH" in enrich_review[0][3]["reason"]


def test_nif_resolves_before_email():
    """Dedupe order: NIF wins over email. When both are present the NIF lookup
    resolves and the email lookup is never even attempted."""
    skill = _make_skill()
    calls = _stub_odoo(skill, match_by="vat")
    _stub_vision(skill, CARD)  # CARD carries both vat and email

    res = skill.extract_and_propose_contact(3)
    payload = json.loads(res["content"])
    assert payload["status"] == "enrich_existing"
    assert payload["existing_partner_id"] == 42

    email_lookups = [c for c in _partner_lookups(calls) if c[2][0][0][0] == "email"]
    assert email_lookups == [], "NIF must resolve before any email lookup"


def test_name_and_company_enriches_when_no_nif_no_email():
    """The loosest dedupe key (name + company) still enriches rather than
    duplicating when there is no NIF and no email to match on."""
    card = {"name": "Ana Ruiz", "company": "Grupos Test SL", "position": "CEO"}
    skill = _make_skill()
    calls = _stub_odoo(skill, match_by="name_company")
    _stub_vision(skill, card, raw_text="Ana Ruiz, CEO, Grupos Test SL")

    res = skill.extract_and_propose_contact(4)
    payload = json.loads(res["content"])
    assert payload["status"] == "enrich_existing"
    assert payload["existing_partner_id"] == 42
    assert _partner_created(calls) is False


def test_illegible_card_creates_nothing_and_goes_to_review():
    """An unreadable card creates nothing and waits in the review queue with the
    reason — the same fail-closed gate T6/T7 apply to the other documents."""
    skill = _make_skill()
    calls = _stub_odoo(skill, match_by=None)
    _stub_vision(skill, error="Vision extraction failed")

    res = skill.extract_and_propose_contact(5)

    assert res.get("isError"), "the user must still be told it failed"
    assert _partner_created(calls) is False
    review = _intake_calls(calls, "mark_review")
    assert review, "an illegible card must wait in the review queue"
    assert "could not be read" in review[0][3]["reason"].lower()
    assert not _intake_calls(calls, "mark_created")


def test_card_with_no_readable_fields_goes_to_review():
    """A card the model parsed into an empty object carries nothing to propose:
    it is not a contact, it goes to review."""
    skill = _make_skill()
    calls = _stub_odoo(skill, match_by=None)
    _stub_vision(skill, card={}, raw_text="")

    res = skill.extract_and_propose_contact(6)

    assert res.get("isError")
    assert _partner_created(calls) is False
    assert _intake_calls(calls, "mark_review")


def test_only_actually_read_fields_appear_in_the_proposal():
    """T4: a field that was not read is absent from the proposal, never an empty
    string or null — the same 'not read' contract every other tool shares."""
    skill = _make_skill()
    _stub_odoo(skill, match_by=None)
    _stub_vision(skill, CARD_PARTIAL, raw_text="maria@nocorp.com")

    res = skill.extract_and_propose_contact(7)
    payload = json.loads(res["content"])
    contact = payload["contact"]

    assert contact.get("name") == "María López"
    assert contact.get("email") == "maria@nocorp.com"
    for missing in ("company", "position", "phone", "mobile", "web", "address", "vat"):
        assert missing not in contact, f"{missing} was not read and must be absent"


def test_dry_run_returns_proposal_without_reporting():
    """dry_run returns the proposal without any intake write-back."""
    skill = _make_skill()
    calls = _stub_odoo(skill, match_by=None)
    _stub_vision(skill)

    res = skill.extract_and_propose_contact(8, dry_run=True)
    payload = json.loads(res["content"])

    assert payload["dry_run"] is True
    assert payload["status"] == "create_new"
    assert not _intake_calls(calls, "mark_created")
    assert not _intake_calls(calls, "mark_review")
    assert _partner_created(calls) is False
