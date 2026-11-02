"""Live discovery of the fields an Odoo instance actually exposes.

Why this exists
---------------
Hardcoded field lists are wrong on a real deployment in two different ways:

* they are never exhaustive. ``mobile`` exists on every Odoo, it was not in the
  list, and the bot answered "that field is not available" for a partner whose
  mobile was filled in (github.com/nicolasramos/odooclaw#81).
* they keep fields this instance does not have. Odoo's ``read`` raises
  ``ValueError: Invalid field ...`` for those, so on an instance without
  ``account`` the partner summary failed outright on ``credit`` / ``debit``.

``fields_get`` answers both questions for the *caller*: Odoo skips every field
the user may not read (``field.is_accessible``), so the schema it returns is
already permission-aware, and it is the same call the ``odoo_get_model_schema``
tool exposes.

Two properties worth stating up front, both measured:

* the schema is **per user**, not per model — the same instance hands out 163
  ``res.partner`` fields to an admin, 154 to an internal user and 140 to a
  portal user — so the cache is keyed by ``(model, sender_id)``;
* the schema only promises the field *groups* allow, not that the field can be
  *computed*: an internal user on an instance with ``account`` is advertised
  ``days_sales_outstanding``, ``journal_item_count`` and
  ``supplier_invoice_count``, and reading any of them raises ``AccessError``
  because the compute touches ``account.move``. That is why
  :func:`read_summary_record` isolates and skips the offending fields instead
  of giving up on the record.

The result is cached per key for 60 seconds — the same TTL the record field
validation already used — so a summary costs at most one extra RPC per model
and user per minute.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Iterable
from typing import Any, cast

_logger = logging.getLogger(__name__)

FIELD_CACHE_TTL_SECONDS = 60.0

#: ``{(model, sender_id): {field_name: fields_get properties}}``, shared by the
#: summary services and by the field validation in ``tools.records``. Keyed by
#: user because ``fields_get`` answers differently for each one.
_field_cache: dict[tuple[str, int | None], dict[str, Any]] = {}
_field_cache_timestamps: dict[tuple[str, int | None], float] = {}

#: ``{(model, sender_id): (stored_at, frozenset of field names)}`` — fields the
#: last read proved this caller cannot read, remembered for the same TTL so only
#: the first summary pays for locating them (29 reads on the instance measured
#: below, 1 read afterwards).
_unreadable_cache: dict[tuple[str, int | None], tuple[float, frozenset]] = {}

#: Field types a summary must not carry: binaries (images, attachments) are
#: base64 blobs, and a one2many value is a list of ids that runs to thousands
#: on any record with chatter (``message_ids``). The model can still be read
#: explicitly through ``odoo_read`` when the caller really wants them.
_NON_SUMMARY_TYPES = frozenset({"binary", "one2many"})

#: Never surfaced in a summary, whatever the schema says.
EXCLUDED_SUMMARY_FIELDS = frozenset({"password"})

#: Fields kept when a full read has to be retried: the smallest set that still
#: identifies the record on any model.
_FALLBACK_FIELDS = ("name", "display_name", "id")

#: Upper bound on the reads spent locating fields Odoo refuses to return. A
#: pathological instance must not turn one summary into an RPC storm: past this
#: budget whatever is left is tried once and then dropped. 32 isolates the
#: three accounting computes an internal user trips over on a 154-field
#: ``res.partner`` (24 left four fields on the floor).
_MAX_PROBE_READS = 32


def get_field_schema(client: Any, model: str, sender_id: int | None = None) -> dict[str, Any]:
    """Return ``fields_get(model)`` for this caller, cached for 60 seconds.

    An unknown model, a permission failure or a transport error all yield an
    empty schema instead of raising: every caller uses this to *decide* what to
    ask Odoo for, and "this instance does not have it" is a valid answer.
    """
    key = (model, sender_id)
    cached_at = _field_cache_timestamps.get(key)
    if cached_at is not None and (time.monotonic() - cached_at) < FIELD_CACHE_TTL_SECONDS:
        return _field_cache[key]

    try:
        fields_info = client.call_kw(model, "fields_get", sender_id=sender_id)
        schema = fields_info if isinstance(fields_info, dict) else {}
    except Exception as exc:  # noqa: BLE001 - degraded schema, never a crash
        _logger.info("fields_get failed for %s: %s", model, exc)
        schema = {}

    _field_cache[key] = schema
    _field_cache_timestamps[key] = time.monotonic()
    return schema


def reset_field_cache() -> None:
    """Drop every cached schema and remembered unreadable field (tests)."""
    _field_cache.clear()
    _field_cache_timestamps.clear()
    _unreadable_cache.clear()


def select_summary_fields(
    client: Any,
    model: str,
    sender_id: int | None = None,
    exclude: Iterable[str] = (),
) -> list[str]:
    """The fields a summary of *model* should read on this instance.

    Technical fields (``_``-prefixed, which also covers ``__``-prefixed synthetic
    keys), binaries, one2many collections and :data:`EXCLUDED_SUMMARY_FIELDS`
    are dropped; everything else the instance exposes — custom fields, fields
    from optional modules, fields that only exist in some Odoo versions — is
    kept. Returns an empty list when the schema is unavailable, so callers can
    tell "no fields" from "no record".
    """
    schema = get_field_schema(client, model, sender_id)
    if not schema:
        return []
    denied = EXCLUDED_SUMMARY_FIELDS | set(exclude)
    return [
        name
        for name, props in schema.items()
        if not name.startswith("_")
        and name not in denied
        and (props or {}).get("type") not in _NON_SUMMARY_TYPES
    ]


def drop_empty_fields(values: dict[str, Any]) -> dict[str, Any]:
    """Keep only non-empty values.

    ``False``/``0``/``""``/``[]``/``None`` are dropped — a summary is what is
    *there*, and a caller who needs the absent fields can ask for them.
    """
    return {key: value for key, value in values.items() if value}


def read_summary_record(
    client: Any,
    model: str,
    res_id: int,
    fields: list[str],
    sender_id: int | None = None,
) -> dict[str, Any] | None:
    """Read one record, isolating the fields Odoo refuses to read.

    Returns the raw record (``id`` included, values untouched) or ``None`` when
    the record does not exist.

    The first read is the normal one, one RPC for everything. Only when it
    fails — a single field whose compute raises must not cost the caller the
    other 150 — are the offending fields located by bisection and everything
    that reads fine kept; they are then remembered for 60 seconds so the next
    summary starts from one read instead of repeating the search. If even that
    yields nothing readable the original error propagates rather than being
    swallowed.
    """
    requested = list(fields) or list(_FALLBACK_FIELDS)
    remembered = _known_unreadable(model, sender_id)
    if remembered:
        trimmed = [name for name in requested if name not in remembered]
        if trimmed:
            requested = trimmed

    try:
        records = _read(client, model, res_id, requested, sender_id)
    except Exception as exc:
        record, bad, skipped, probes = _read_isolating_failures(
            client, model, res_id, requested, sender_id
        )
        if record is None:
            # The record went away under us (or never existed for this caller).
            return None
        if not record:
            # Nothing readable at all: missing model, no access to the record,
            # or a probe budget spent with no gain. Loud beats partial.
            raise
        _remember_unreadable(model, sender_id, set(bad))
        _logger.warning(
            "summary read of %s[%s] skipped %d unreadable field(s) %s"
            " (+%d dropped by the probe budget) after %d reads: %s",
            model,
            res_id,
            len(bad),
            sorted(bad)[:8],
            skipped,
            probes,
            exc,
        )
        return record
    if not records:
        return None
    return records[0]


def _known_unreadable(model: str, sender_id: int | None) -> frozenset:
    """Fields proven unreadable for this caller in the last 60 seconds."""
    entry = _unreadable_cache.get((model, sender_id))
    if entry is None:
        return frozenset()
    stored_at, names = entry
    if (time.monotonic() - stored_at) >= FIELD_CACHE_TTL_SECONDS:
        _unreadable_cache.pop((model, sender_id), None)
        return frozenset()
    return names


def _remember_unreadable(model: str, sender_id: int | None, names: Iterable[str]) -> None:
    """Remember the fields a read just proved unreadable (same 60 s TTL)."""
    names = frozenset(names)
    if not names:
        return
    key = (model, sender_id)
    entry = _unreadable_cache.get(key)
    if entry is not None and (time.monotonic() - entry[0]) < FIELD_CACHE_TTL_SECONDS:
        names = entry[1] | names
    _unreadable_cache[key] = (time.monotonic(), names)


def _read_isolating_failures(
    client: Any,
    model: str,
    res_id: int,
    fields: list[str],
    sender_id: int | None,
) -> tuple[dict[str, Any] | None, list[str], int, int]:
    """Split *fields* into the ones that read and the ones that raise.

    Breadth-first bisection: a chunk that reads contributes its values in one
    go, a chunk that fails is split in two, and a failing chunk of one field is
    the culprit. Breadth-first order means the fields Odoo defines first (the
    base model's own) are read before the budget can run out.

    Returns ``(record, bad_fields, skipped_fields, reads)``; ``record`` is
    ``None`` when the record does not exist, and ``{}`` when nothing could be
    read.
    """
    merged: dict[str, Any] = {}
    bad: list[str] = []
    skipped = 0
    queue: list[list[str]] = [list(fields)]
    probes = 0

    while queue:
        over_budget = probes >= _MAX_PROBE_READS
        if over_budget:
            # Budget spent: everything left goes in one final read, and if that
            # fails those fields are dropped instead of probed further.
            chunk = [name for part in queue for name in part]
            queue = []
        else:
            chunk = queue.pop(0)
        probes += 1

        try:
            records = _read(client, model, res_id, chunk, sender_id)
        except Exception:
            if len(chunk) == 1:
                bad.append(chunk[0])
            elif over_budget:
                skipped += len(chunk)
            else:
                mid = len(chunk) // 2
                queue.append(chunk[:mid])
                queue.append(chunk[mid:])
            continue

        if not records:
            return None, bad, skipped, probes
        merged.update(records[0])

    return merged, bad, skipped, probes


def _read(
    client: Any,
    model: str,
    res_id: int,
    fields: list[str],
    sender_id: int | None,
) -> list[dict[str, Any]]:
    return cast(
        list[dict[str, Any]],
        client.call_kw(
            model,
            "read",
            args=[[res_id]],
            kwargs={"fields": fields},
            sender_id=sender_id,
        ),
    )
