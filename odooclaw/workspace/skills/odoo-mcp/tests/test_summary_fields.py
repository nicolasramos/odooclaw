"""Dynamic summary field discovery (github.com/nicolasramos/odooclaw#81).

The old summaries read a table of hardcoded field lists. These tests pin the
replacement: the field list comes from ``fields_get`` on the running instance,
empties are dropped, collections/binaries/technical fields are never requested,
and a summary survives an instance that lacks ``account`` / ``sale``.

Every test is written to fail against the hardcoded implementation: the fake
client behaves like Odoo and raises ``ValueError: Invalid field ...`` for any
field it was asked to read that the model does not have — which is exactly what
a real instance answers.
"""

from unittest.mock import MagicMock

from odoo_mcp.core import field_schema
from odoo_mcp.core.client import OdooClient
from odoo_mcp.core.session import OdooSession
from odoo_mcp.services.generic_service import get_record_summary
from odoo_mcp.services.partner_service import get_partner_summary
from odoo_mcp.tools import records as records_tool

# ---------------------------------------------------------------------------
# A fake Odoo that behaves like the real one where it matters
# ---------------------------------------------------------------------------

_TYPE_DEFAULTS = {
    "char": "",
    "text": "",
    "html": "",
    "boolean": False,
    "integer": 0,
    "float": 0.0,
    "monetary": 0.0,
    "date": False,
    "datetime": False,
    "selection": False,
    "many2one": False,
    "one2many": [],
    "many2many": [],
    "binary": False,
}


def make_record(schema, **values):
    """A full record for *schema*: every field with its type default, then overrides."""
    record = {name: _TYPE_DEFAULTS.get(props.get("type"), False) for name, props in schema.items()}
    record.update(values)
    return record


class FakeOdoo(OdooClient):
    """``call_kw`` facade that mimics the Odoo behaviour summaries depend on.

    * unknown model → ``fields_get`` and ``search_count`` raise (JSON-RPC error);
    * ``read`` of a field the model does not have → ``ValueError``, like
      ``models.py:3868`` — the failure that made a hardcoded list deadly;
    * ``read`` always answers with ``id`` (``_read_format``);
    * a record id that does not exist → empty list, not an error.
    """

    def __init__(self, schemas=None, records=None, counts=None, broken_read_fields=()):
        # The session is never used here: everything under test goes through
        # call_kw, which this class replaces entirely.
        super().__init__(MagicMock(spec=OdooSession))
        # own copies, like a fresh JSON-RPC response would hand us
        self.schemas = {model: dict(props) for model, props in (schemas or {}).items()}
        self.records = records or {}
        self.counts = counts or {}
        self.broken_read_fields = set(broken_read_fields)
        self.calls = []

    def call_kw(self, model, method, args=None, kwargs=None, sender_id=None):
        args = args or []
        kwargs = kwargs or {}
        self.calls.append((model, method, kwargs))

        if method == "fields_get":
            if model not in self.schemas:
                raise ValueError(f"Model {model} doesn't exist")
            # a new dict per call, like a fresh JSON-RPC response
            return dict(self.schemas[model])

        if method == "search_count":
            if model not in self.schemas:
                raise ValueError(f"Model {model} doesn't exist")
            return self.counts.get(model, 0)

        if method == "read":
            requested = list(kwargs.get("fields") or [])
            if not requested:
                requested = list(self.schemas.get(model, {}))
            unknown = [f for f in requested if f not in self.schemas.get(model, {})]
            if unknown:
                raise ValueError(f"Invalid field {unknown[0]!r} on model {model!r}")
            broken = sorted(set(requested) & self.broken_read_fields)
            if broken:
                raise ValueError(f"compute failed for field {broken[0]!r}")
            out = []
            for res_id in args[0]:
                record = self.records.get((model, res_id))
                if record is None:
                    continue
                out.append({"id": res_id, **{f: record.get(f) for f in requested}})
            return out

        raise AssertionError(f"unexpected call_kw: {model}.{method}")

    def requested_fields(self, model, method="read"):
        return [
            kwargs.get("fields") for m, meth, kwargs in self.calls if m == model and meth == method
        ]


# Schemas ------------------------------------------------------------------

PARTNER_SCHEMA = {
    "id": {"type": "integer"},
    "name": {"type": "char"},
    "display_name": {"type": "char"},
    "email": {"type": "char"},
    "phone": {"type": "char"},
    "mobile": {"type": "char"},  # outside the old hardcoded list (#81)
    "street": {"type": "char"},  # outside the old hardcoded list
    "city": {"type": "char"},  # outside the old hardcoded list
    "user_id": {"type": "many2one"},
    "credit": {"type": "monetary"},
    "debit": {"type": "monetary"},
    "active": {"type": "boolean"},
    "child_ids": {"type": "one2many"},  # ids, not values
    "message_ids": {"type": "one2many"},  # ids, not values (chatter)
    "image_1920": {"type": "binary"},  # base64 blob
    "password": {"type": "char"},  # secret
    "_order": {"type": "char"},  # technical
}

PARTNER_RECORD = make_record(
    PARTNER_SCHEMA,
    name="E2E Mobile Co",
    display_name="E2E Mobile Co",
    email="e2e@example.com",
    phone="+34600000002",
    mobile="+34600000001",
    street="Calle E2E 1",
    city="Santa Cruz de Tenerife",
    credit=100.5,
    debit=40.25,
    child_ids=[7, 8],
    message_ids=[1, 2, 3],
    image_1920="aGVsbG8=",
    password="hunter2",
)

SALE_SCHEMA = {"id": {"type": "integer"}, "name": {"type": "char"}, "state": {"type": "selection"}}
INVOICE_SCHEMA = {
    "id": {"type": "integer"},
    "name": {"type": "char"},
    "payment_state": {"type": "selection"},
}


def _client(**kwargs):
    field_schema.reset_field_cache()
    return FakeOdoo(**kwargs)


# ---------------------------------------------------------------------------
# Partner summary
# ---------------------------------------------------------------------------


def test_partner_summary_reports_fields_the_hardcoded_list_never_had():
    """The bug from #81: `mobile` is filled in, the summary must show it."""
    client = _client(
        schemas={
            "res.partner": PARTNER_SCHEMA,
            "sale.order": SALE_SCHEMA,
            "account.move": INVOICE_SCHEMA,
        },
        records={("res.partner", 1): PARTNER_RECORD},
        counts={"sale.order": 3, "account.move": 2},
    )

    summary = get_partner_summary(client, 2, 1)

    assert summary["mobile"] == "+34600000001"
    assert summary["street"] == "Calle E2E 1"
    assert summary["city"] == "Santa Cruz de Tenerife"
    assert summary["name"] == "E2E Mobile Co"
    assert summary["open_sale_orders"] == 3
    assert summary["open_invoices"] == 2


def test_partner_summary_never_requests_collections_binary_or_technical_fields():
    client = _client(
        schemas={
            "res.partner": PARTNER_SCHEMA,
            "sale.order": SALE_SCHEMA,
            "account.move": INVOICE_SCHEMA,
        },
        records={("res.partner", 1): PARTNER_RECORD},
    )

    get_partner_summary(client, 2, 1)

    (requested,) = client.requested_fields("res.partner")
    assert "child_ids" not in requested  # one2many
    assert "message_ids" not in requested  # one2many (chatter)
    assert "image_1920" not in requested  # binary
    assert "password" not in requested  # secret
    assert not [f for f in requested if f.startswith("_")]


def test_partner_summary_survives_an_instance_without_accounting():
    """No `credit`/`debit`, no `sale.order`, no `account.move`: still an answer.

    Against the hardcoded implementation this raises
    ``ValueError: Invalid field 'credit'`` — the whole summary dies because
    this instance does not have the accounting module.
    """
    schema = {k: v for k, v in PARTNER_SCHEMA.items() if k not in ("credit", "debit")}
    record = {k: v for k, v in PARTNER_RECORD.items() if k not in ("credit", "debit")}
    client = _client(schemas={"res.partner": schema}, records={("res.partner", 1): record})

    summary = get_partner_summary(client, 2, 1)

    assert summary["name"] == "E2E Mobile Co"
    assert summary["mobile"] == "+34600000001"
    assert "financial_balance" not in summary
    assert summary["open_sale_orders"] is None
    assert summary["open_invoices"] is None
    # and the read never asked for a field this instance doesn't have
    (requested,) = client.requested_fields("res.partner")
    assert "credit" not in requested
    assert "debit" not in requested
    assert not [
        c for c in client.calls if c[0] in ("sale.order", "account.move") and c[1] == "search_count"
    ]


def test_partner_summary_folds_credit_and_debit_into_one_balance():
    client = _client(
        schemas={
            "res.partner": PARTNER_SCHEMA,
            "sale.order": SALE_SCHEMA,
            "account.move": INVOICE_SCHEMA,
        },
        records={("res.partner", 1): PARTNER_RECORD},
    )

    summary = get_partner_summary(client, 2, 1)

    assert summary["financial_balance"] == 60.25
    assert "credit" not in summary
    assert "debit" not in summary


def test_partner_summary_keeps_the_salesperson_alias():
    schema = dict(PARTNER_SCHEMA)
    record = make_record(schema, name="E2E Mobile Co", user_id=[2, "Mitchell Admin"])
    client = _client(
        schemas={"res.partner": schema, "sale.order": SALE_SCHEMA, "account.move": INVOICE_SCHEMA},
        records={("res.partner", 1): record},
    )

    summary = get_partner_summary(client, 2, 1)

    assert summary["salesperson"] == "Mitchell Admin"


def test_partner_summary_drops_empty_values_and_keeps_the_id():
    record = make_record(PARTNER_SCHEMA, name="E2E Mobile Co", phone=False, email="", active=False)
    client = _client(
        schemas={
            "res.partner": PARTNER_SCHEMA,
            "sale.order": SALE_SCHEMA,
            "account.move": INVOICE_SCHEMA,
        },
        records={("res.partner", 1): record},
    )

    summary = get_partner_summary(client, 2, 1)

    assert summary["id"] == 1
    assert summary["name"] == "E2E Mobile Co"
    assert "phone" not in summary
    assert "email" not in summary
    assert "active" not in summary
    assert "street" not in summary
    # derived answers are always reported, even when they are zero
    assert summary["open_sale_orders"] == 0


def test_partner_summary_of_a_missing_partner_is_an_error_dict():
    client = _client(schemas={"res.partner": PARTNER_SCHEMA}, records={})

    assert get_partner_summary(client, 2, 999999) == {"error": "Partner not found"}


def test_partner_summary_keeps_the_salesperson_alias_out_of_empty_values():
    """`user_id` empty → no alias key at all (nothing to report)."""
    schema = dict(PARTNER_SCHEMA)
    record = make_record(schema, name="No Salesperson")
    client = _client(
        schemas={"res.partner": schema, "sale.order": SALE_SCHEMA, "account.move": INVOICE_SCHEMA},
        records={("res.partner", 1): record},
    )

    summary = get_partner_summary(client, 2, 1)

    assert "user_id" not in summary
    assert "salesperson" not in summary


# ---------------------------------------------------------------------------
# Generic record summary
# ---------------------------------------------------------------------------

PRODUCT_SCHEMA = {
    "id": {"type": "integer"},
    "name": {"type": "char"},
    "display_name": {"type": "char"},
    "default_code": {"type": "char"},
    "list_price": {"type": "float"},
    "is_storable": {"type": "boolean"},
    "categ_id": {"type": "many2one"},
    "image_1920": {"type": "binary"},
}


def test_record_summary_of_an_unknown_model_uses_the_live_schema():
    """`product.template` was never in SUMMARY_FIELDS: it got `display_name` only."""
    client = _client(
        schemas={"product.template": PRODUCT_SCHEMA},
        records={
            ("product.template", 5): make_record(
                PRODUCT_SCHEMA,
                name="Blue Widget",
                display_name="Blue Widget",
                default_code="W-BLU",
                list_price=19.95,
                categ_id=[3, "Widgets"],
            )
        },
    )

    summary = get_record_summary(client, 2, "product.template", 5)

    assert summary["default_code"] == "W-BLU"
    assert summary["list_price"] == 19.95
    assert summary["categ_id"] == [3, "Widgets"]
    assert "image_1920" not in summary


def test_record_summary_drops_empty_values_and_reports_missing_records():
    client = _client(
        schemas={"product.template": PRODUCT_SCHEMA},
        records={("product.template", 5): make_record(PRODUCT_SCHEMA, name="Blue Widget")},
    )

    summary = get_record_summary(client, 2, "product.template", 5)

    assert summary["name"] == "Blue Widget"
    assert summary["id"] == 5
    assert "list_price" not in summary  # 0.0 → empty
    assert "is_storable" not in summary  # False → empty
    assert "image_1920" not in summary  # binary → never requested

    missing = get_record_summary(client, 2, "product.template", 404)
    assert missing == {"error": "Record 404 not found in product.template"}


def test_record_summary_of_an_unknown_model_returns_an_actionable_error():
    """No schema and no readable record → name the problem, point at the tool.

    The old code asked Odoo for ``display_name`` anyway and let the RPC error
    propagate as an opaque 500 (the class of failure issue #82 is about).
    """
    client = _client(schemas={}, records={})

    summary = get_record_summary(client, 2, "does.not.exist", 1)

    assert "does.not.exist" in summary["error"]
    assert "odoo_get_model_schema" in summary["error"]


def test_record_summary_skips_the_fields_that_raise_and_keeps_the_rest():
    """A field Odoo refuses to read costs only that field, never the record.

    Regression for the review of PR #114: the old fallback collapsed to
    `name`/`display_name`/`id`, so an internal user without accounting got a
    three-field summary — the #81 symptom again, for that class of user.
    `categ_id` is not in that minimal set, so its presence proves no collapse.
    """
    client = _client(
        schemas={"product.template": PRODUCT_SCHEMA},
        records={
            ("product.template", 5): make_record(
                PRODUCT_SCHEMA,
                name="Blue Widget",
                default_code="W-BLU",
                categ_id=[3, "Widgets"],
            )
        },
        broken_read_fields={"default_code", "list_price", "is_storable"},
    )

    summary = get_record_summary(client, 2, "product.template", 5)

    assert summary["name"] == "Blue Widget"
    assert summary["id"] == 5
    assert summary["categ_id"] == [3, "Widgets"]  # not in the minimal fallback
    assert "default_code" not in summary  # raised
    assert "list_price" not in summary  # raised
    assert "is_storable" not in summary  # raised


# ---------------------------------------------------------------------------
# The shared, cached schema
# ---------------------------------------------------------------------------


def test_fields_get_is_cached_per_model():
    client = _client(
        schemas={
            "res.partner": PARTNER_SCHEMA,
            "sale.order": SALE_SCHEMA,
            "account.move": INVOICE_SCHEMA,
        },
        records={("res.partner", 1): PARTNER_RECORD},
    )

    get_partner_summary(client, 2, 1)
    get_partner_summary(client, 2, 1)

    fields_get_calls = [c for c in client.calls if c[1] == "fields_get"]
    assert [c[0] for c in fields_get_calls] == ["res.partner", "sale.order", "account.move"]


def test_select_summary_fields_returns_empty_when_there_is_no_schema():
    client = _client(schemas={})

    assert field_schema.select_summary_fields(client, "missing.model", 2) == []


def test_expired_cache_is_refetched():
    """The TTL is real: a schema change is picked up after 60 seconds."""
    client = _client(
        schemas={"res.partner": PARTNER_SCHEMA}, records={("res.partner", 1): PARTNER_RECORD}
    )

    field_schema.select_summary_fields(client, "res.partner", 2)

    # the instance gained a custom field while we were caching
    client.schemas["res.partner"]["x_custom_field"] = {"type": "char"}

    stale = field_schema.select_summary_fields(client, "res.partner", 2)
    assert "x_custom_field" not in stale  # still cached

    # pretend 61 seconds went by
    for model, ts in list(field_schema._field_cache_timestamps.items()):
        field_schema._field_cache_timestamps[model] = ts - (
            field_schema.FIELD_CACHE_TTL_SECONDS + 1
        )

    fresh = field_schema.select_summary_fields(client, "res.partner", 2)
    assert "x_custom_field" in fresh


def test_records_field_validation_sees_the_schema_after_the_ttl():
    """The TTL fix is reachable through ``tools.records``, not only the helper.

    On `main` the old cache compared a timestamp with itself, so it never
    expired and a field added to the instance was never picked up.
    """
    client = _client(
        schemas={"res.partner": PARTNER_SCHEMA},
        records={("res.partner", 1): PARTNER_RECORD},
    )

    assert "mobile" in records_tool._get_model_fields(client, "res.partner", 2)

    client.schemas["res.partner"]["x_custom_field"] = {"type": "char"}
    assert "x_custom_field" not in records_tool._get_model_fields(
        client, "res.partner", 2
    )  # still cached

    for key, ts in list(field_schema._field_cache_timestamps.items()):
        field_schema._field_cache_timestamps[key] = ts - (field_schema.FIELD_CACHE_TTL_SECONDS + 1)

    assert "x_custom_field" in records_tool._get_model_fields(client, "res.partner", 2)


# ---------------------------------------------------------------------------
# A user whose schema advertises fields their computes cannot answer
# ---------------------------------------------------------------------------

#: What an instance with ``account`` hands an internal user: no ``credit``/
#: ``debit`` (group-restricted), but three accounting computes whose read
#: raises ``AccessError`` — measured on Odoo 18 (154 fields for the internal
#: user vs 163 for admin).
INTERNAL_PARTNER_SCHEMA = {
    name: props for name, props in PARTNER_SCHEMA.items() if name not in ("credit", "debit")
}
INTERNAL_PARTNER_SCHEMA.update(
    {
        "days_sales_outstanding": {"type": "float"},
        "journal_item_count": {"type": "integer"},
        "supplier_invoice_count": {"type": "integer"},
    }
)
ACCOUNTING_FIELDS_THAT_RAISE = (
    "days_sales_outstanding",
    "journal_item_count",
    "supplier_invoice_count",
)


def test_partner_summary_keeps_mobile_when_accounting_computes_raise():
    """The review case: only the fields that raise are lost, never the rest.

    Before the fix this summary collapsed to ``id``/``name``/``display_name``
    — no ``mobile``, no ``street``, no ``city``: the #81 symptom again for a
    user without accounting permissions.
    """
    record = make_record(
        INTERNAL_PARTNER_SCHEMA,
        name="E2E Mobile Co",
        display_name="E2E Mobile Co",
        mobile="+34600000001",
        street="Calle E2E 1",
        city="Santa Cruz de Tenerife",
    )
    client = _client(
        schemas={
            "res.partner": INTERNAL_PARTNER_SCHEMA,
            "sale.order": SALE_SCHEMA,
            "account.move": INVOICE_SCHEMA,
        },
        records={("res.partner", 1): record},
        broken_read_fields=ACCOUNTING_FIELDS_THAT_RAISE,
    )

    summary = get_partner_summary(client, 10, 1)

    assert summary["mobile"] == "+34600000001"
    assert summary["street"] == "Calle E2E 1"
    assert summary["city"] == "Santa Cruz de Tenerife"
    assert not [f for f in ACCOUNTING_FIELDS_THAT_RAISE if f in summary]
    assert "financial_balance" not in summary  # no accounting for this user
    # locating the bad fields must stay cheap and bounded
    reads = [c for c in client.calls if c[1] == "read"]
    assert len(reads) <= field_schema._MAX_PROBE_READS + 2


def test_probe_budget_bounds_the_reads_when_almost_everything_raises():
    """No matter how broken the instance is, one summary stays bounded."""
    broken = set(PARTNER_SCHEMA) - {"name"}
    client = _client(
        schemas={"res.partner": PARTNER_SCHEMA},
        records={("res.partner", 1): PARTNER_RECORD},
        broken_read_fields=broken,
    )

    summary = get_partner_summary(client, 2, 1)

    assert summary["name"] == "E2E Mobile Co"  # what could be read, was read
    reads = [c for c in client.calls if c[1] == "read"]
    assert len(reads) <= field_schema._MAX_PROBE_READS + 2


def test_unreadable_fields_are_remembered_for_the_ttl():
    """Only the first summary pays for finding the bad fields.

    Locating three unreadable computes on a 154-field schema costs ~29 reads;
    the next summary must be a single read, not a repeat of the search.
    """
    record = make_record(
        INTERNAL_PARTNER_SCHEMA,
        name="E2E Mobile Co",
        display_name="E2E Mobile Co",
        mobile="+34600000001",
    )
    client = _client(
        schemas={
            "res.partner": INTERNAL_PARTNER_SCHEMA,
            "sale.order": SALE_SCHEMA,
            "account.move": INVOICE_SCHEMA,
        },
        records={("res.partner", 1): record},
        broken_read_fields=ACCOUNTING_FIELDS_THAT_RAISE,
    )

    first = get_partner_summary(client, 10, 1)
    first_reads = len([c for c in client.calls if c[1] == "read"])

    second = get_partner_summary(client, 10, 1)
    second_reads = len([c for c in client.calls if c[1] == "read"]) - first_reads

    assert first["mobile"] == "+34600000001"
    assert second["mobile"] == "+34600000001"
    assert first_reads > 1  # the search did happen
    assert second_reads == 1  # ... and only once


def test_the_schema_cache_is_keyed_by_user():
    """``fields_get`` answers differently per user, so the cache must too."""
    admin_schema = dict(PARTNER_SCHEMA)
    internal_schema = dict(INTERNAL_PARTNER_SCHEMA)
    client = FakeOdoo(
        schemas={"res.partner": admin_schema},
        records={("res.partner", 1): PARTNER_RECORD},
    )

    def call_kw(model, method, *args, **kwargs):
        client.calls.append((model, method, kwargs))
        if method == "fields_get":
            return dict(internal_schema if kwargs.get("sender_id") == 10 else admin_schema)
        return FakeOdoo.call_kw(client, model, method, *args, **kwargs)

    client.call_kw = call_kw

    as_admin = field_schema.select_summary_fields(client, "res.partner", 2)
    as_internal = field_schema.select_summary_fields(client, "res.partner", 10)

    assert "credit" in as_admin
    assert "credit" not in as_internal
    assert "journal_item_count" in as_internal
    # both were fetched: the cache did not hand the internal user the admin's schema
    fields_gets = [c for c in client.calls if c[1] == "fields_get"]
    assert len(fields_gets) == 2
