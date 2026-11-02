"""End-to-end check for the dynamic summary fields (odooclaw#81).

Runs the real MCP tools against a real Odoo — login, ``fields_get`` discovery,
the ``/odooclaw/call_kw_as_user`` delegation, the summary — and asserts what the
hardcoded implementation could not deliver.

Required environment (same convention as ``get_odoo_client``)::

    ODOO_URL  ODOO_DB  ODOO_USERNAME  ODOO_PASSWORD  ODOOCLAW_REPLY_TOKEN

Optional:

``E2E_PARTNER_NAME``    partner to summarise (default ``E2E Mobile Co``, one
                        with ``mobile`` filled in)
``E2E_SENDER_LOGIN``    impersonate this user on every call instead of the
                        session user — the way to exercise the tool as an
                        internal user without accounting rights, which is
                        where ``fields_get`` advertises computes that raise
``E2E_PROBE_MODEL``     model for the "outside the old table" check
                        (default ``res.country``)

Exit code 0 when every check passes, 1 otherwise. Run it once per instance::

    PYTHONPATH=src python tests/e2e_summary_fields.py
"""

import json
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "../src"))

from odoo_mcp.server import (  # noqa: E402
    get_odoo_client,
    odoo_get_partner_summary,
    odoo_get_record_summary,
    odoo_search,
)

PARTNER_NAME = os.environ.get("E2E_PARTNER_NAME", "E2E Mobile Co")
SENDER_LOGIN = os.environ.get("E2E_SENDER_LOGIN", "")
# A model that exists on any Odoo and was never in the old SUMMARY_FIELDS table.
PROBE_MODEL = os.environ.get("E2E_PROBE_MODEL", "res.country")
UNKNOWN_MODEL = "does.not.exist"
# Advertised by an instance with `account` to a user without accounting rights
# and unreadable for them: their compute touches account.move.
ACCOUNTING_FIELDS = (
    "days_sales_outstanding",
    "journal_item_count",
    "supplier_invoice_count",
)

_results = []


def check(name, ok, detail=""):
    _results.append(bool(ok))
    mark = "\033[92m[PASS]\033[0m" if ok else "\033[91m[FAIL]\033[0m"
    print(f"{mark} {name:<62} {detail}")


def _schema(client, model, sender):
    try:
        return client.call_kw(model, "fields_get", sender_id=sender) or {}
    except Exception:
        return {}


def _can_count(client, model, sender):
    """True when the sender can see the model *and* count on it."""
    if not _schema(client, model, sender):
        return False
    try:
        client.call_kw(model, "search_count", args=[[]], sender_id=sender)
        return True
    except Exception:
        return False


def _field_raises(client, model, res_id, field, sender):
    """True when reading this single field fails for this sender."""
    if field not in _schema(client, model, sender):
        return False
    try:
        client.call_kw(model, "read", args=[[res_id]], kwargs={"fields": [field]}, sender_id=sender)
        return False
    except Exception:
        return True


def run():
    print("\nE2E - dynamic summary fields (github.com/nicolasramos/odooclaw#81)\n")
    print(
        f"ODOO_URL={os.environ.get('ODOO_URL')}  ODOO_DB={os.environ.get('ODOO_DB')}"
        f"  sender={SENDER_LOGIN or '(session user)'}\n"
    )

    try:
        client = get_odoo_client()
        session_uid = client.odoo_session.get_uid()
    except Exception as exc:  # noqa: BLE001
        check("login", False, str(exc))
        return

    sender = session_uid
    if SENDER_LOGIN:
        try:
            found = client.call_kw(
                "res.users",
                "search",
                args=[[["login", "=", SENDER_LOGIN]]],
                kwargs={"limit": 1},
                sender_id=session_uid,
            )
            sender = found[0]
        except Exception as exc:  # noqa: BLE001
            check(f"resolve sender '{SENDER_LOGIN}'", False, str(exc))
            return
        check(
            f"impersonating '{SENDER_LOGIN}' (session stays uid {session_uid})",
            sender != session_uid,
            f"sender_id={sender}",
        )

    partner_schema = _schema(client, "res.partner", sender)
    check("login (session established)", bool(session_uid), f"uid={session_uid}")
    check(
        "sender gets fields_get for res.partner",
        bool(partner_schema),
        f"{len(partner_schema)} fields for sender {sender}",
    )

    # --- the partner -------------------------------------------------------
    ids = odoo_search(
        model="res.partner",
        domain=[["name", "=", PARTNER_NAME]],
        limit=1,
        sender_id=sender,
    )
    if not ids:
        check(f"found partner '{PARTNER_NAME}'", False, "create it in the instance first")
        return
    partner_id = ids[0]

    summary = odoo_get_partner_summary(partner_id=partner_id, sender_id=sender)
    print("\npartner summary ->\n" + json.dumps(summary, indent=2, default=str)[:1600] + "\n")

    check(
        "partner summary returns 'mobile' (#81's exact symptom)",
        summary.get("mobile") == os.environ.get("E2E_MOBILE", "+34600000001"),
        f"mobile={summary.get('mobile')!r}",
    )
    check(
        "fields outside the old hardcoded list are reported",
        bool(summary.get("street")) and bool(summary.get("city")),
        f"street={summary.get('street')!r} city={summary.get('city')!r}",
    )
    check(
        "summary carries the record id", summary.get("id") == partner_id, f"id={summary.get('id')}"
    )

    empty = [
        k
        for k, v in summary.items()
        if v in ("", [], {}, None) and k not in ("open_sale_orders", "open_invoices")
    ]
    check("no empty values in the summary", not empty, f"empty={empty}")

    forbidden = [
        k
        for k in summary
        if k in ("child_ids", "message_ids", "image_1920", "password") or k.startswith("_")
    ]
    check("no collections / binaries / technical fields", not forbidden, f"present={forbidden}")

    # --- the guards ---------------------------------------------------------
    has_credit = "credit" in partner_schema
    can_count_sale = _can_count(client, "sale.order", sender)
    can_count_invoices = _can_count(client, "account.move", sender)

    check(
        "financial_balance present iff the sender has credit/debit",
        ("financial_balance" in summary) == has_credit,
        f"credit in schema={has_credit} balance={summary.get('financial_balance')!r}",
    )
    check(
        "open_sale_orders is a count iff the sender can count them (else null)",
        (
            isinstance(summary.get("open_sale_orders"), int)
            if can_count_sale
            else summary.get("open_sale_orders") is None
        ),
        f"can_count={can_count_sale} value={summary.get('open_sale_orders')!r}",
    )
    check(
        "open_invoices is a count iff the sender can count them (else null)",
        (
            isinstance(summary.get("open_invoices"), int)
            if can_count_invoices
            else summary.get("open_invoices") is None
        ),
        f"can_count={can_count_invoices} value={summary.get('open_invoices')!r}",
    )
    check(
        "credit/debit folded into the balance, never reported raw",
        ("credit" not in summary and "debit" not in summary) if has_credit else True,
        f"credit={summary.get('credit')!r} debit={summary.get('debit')!r}",
    )

    # A field the schema advertises but this sender cannot read must be skipped:
    # never fatal, and never an excuse to hand back a three-field summary.
    unreadable = [
        f for f in ACCOUNTING_FIELDS if _field_raises(client, "res.partner", partner_id, f, sender)
    ]
    leaked = [f for f in unreadable if f in summary]
    check(
        "fields whose compute raises are skipped, not fatal",
        not leaked,
        f"unreadable for this sender={unreadable} leaked={leaked}",
    )
    check(
        "summary is not collapsed to the minimal fallback",
        len(summary) >= 8,
        f"{len(summary)} keys (id/name/display_name would be 3)",
    )

    # --- generic record summary --------------------------------------------
    probe_ids = odoo_search(model=PROBE_MODEL, domain=[], limit=1, sender_id=sender)
    probe = (
        odoo_get_record_summary(model=PROBE_MODEL, res_id=probe_ids[0], sender_id=sender)
        if probe_ids
        else {}
    )
    print(f"\n{PROBE_MODEL} summary ->\n" + json.dumps(probe, indent=2, default=str)[:900] + "\n")
    check(
        f"record summary of {PROBE_MODEL} uses the live schema (not display_name only)",
        len([k for k in probe if k != "id"]) > 1,
        f"keys={sorted(probe)}",
    )

    # Two layers can reject a model that does not exist: the access guard (its
    # allowlist comes from ir.model) and, once that passes, the summary itself.
    # Either way the answer must name the model instead of a bare 500.
    where = "summary"
    try:
        unknown = odoo_get_record_summary(model=UNKNOWN_MODEL, res_id=1, sender_id=sender)
        unknown_error = unknown.get("error", "") if isinstance(unknown, dict) else str(unknown)
    except Exception as exc:  # noqa: BLE001 - the guard raises instead
        where = "guard"
        unknown_error = f"{type(exc).__name__}: {exc}"
    check(
        "unknown model → error naming the model (and, when it reaches the "
        "summary, pointing at odoo_get_model_schema)",
        UNKNOWN_MODEL in unknown_error
        and ("odoo_get_model_schema" in unknown_error or where == "guard"),
        f"via {where}: {unknown_error[:90]!r}",
    )

    missing = odoo_get_partner_summary(partner_id=999999999, sender_id=sender)
    check(
        "missing partner is an error dict, not a crash",
        isinstance(missing, dict) and "error" in missing,
        f"error={missing.get('error') if isinstance(missing, dict) else missing!r}",
    )


def main():
    try:
        run()
    except Exception as exc:  # noqa: BLE001 - a raised error is a failed suite
        check("unexpected exception", False, f"{type(exc).__name__}: {exc}")
    passed = sum(1 for r in _results if r)
    print(f"\n{passed}/{len(_results)} checks passed")
    sys.exit(0 if _results and all(_results) else 1)


if __name__ == "__main__":
    main()
