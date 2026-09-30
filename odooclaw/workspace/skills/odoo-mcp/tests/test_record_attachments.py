"""Regression tests for attachment_ids normalisation in odoo_create (NRA-3737).

Odoo 17's `mail.thread.message_post` validates `attachment_ids` as a literal
list of ids and raises ValueError on the x2many command form:

    if attachment_ids and not tools.is_list_of(attachment_ids, int):
        raise ValueError(...'as a list of IDs (received %(aids)s)')

A model emitting `[(6, 0, [id])]` therefore loses the file. Measured against a
real Odoo 17: command form -> ValueError; bare list -> message with attachment.

Bidirectional control: the shape tests fail without `_normalize_attachment_ids`
(calling odoo_create with the command form would forward it untouched), and the
pass-through tests assert we did NOT rewrite anything that was already valid.
"""

import pytest
from unittest.mock import MagicMock

from odoo_mcp.tools.records import _normalize_attachment_ids, odoo_create


class TestNormalizeAttachmentIds:
    """Pure unit tests on the normaliser."""

    def test_x2many_command_form_is_flattened(self):
        # the exact shape the model produced against the live client
        assert _normalize_attachment_ids(
            {"attachment_ids": [(6, 0, [48341])]}
        )["attachment_ids"] == [48341]

    def test_x2many_command_form_as_list_of_lists(self):
        # JSON-RPC delivers tuples as lists
        assert _normalize_attachment_ids(
            {"attachment_ids": [[6, 0, [1, 2]]]}
        )["attachment_ids"] == [1, 2]

    def test_bare_list_of_ints_is_untouched(self):
        out = _normalize_attachment_ids({"attachment_ids": [1, 2, 3]})
        assert out["attachment_ids"] == [1, 2, 3]

    def test_mixed_bare_and_command(self):
        assert _normalize_attachment_ids(
            {"attachment_ids": [48341, [6, 0, [1]]]}
        )["attachment_ids"] == [48341, 1]

    def test_unknown_shape_is_left_alone(self):
        # never guess: an unrecognised value must pass through unchanged
        weird = {"attachment_ids": "not-a-list-shape"}
        assert _normalize_attachment_ids(weird) is weird
        assert _normalize_attachment_ids(
            {"attachment_ids": [{"nope": 1}]}
        )["attachment_ids"] == [{"nope": 1}]

    def test_empty_and_absent_are_noops(self):
        assert _normalize_attachment_ids({"body": "hi"}) == {"body": "hi"}
        assert _normalize_attachment_ids({"attachment_ids": []})["attachment_ids"] == []

    def test_does_not_mutate_the_caller_dict(self):
        original = {"attachment_ids": [(6, 0, [7])]}
        _normalize_attachment_ids(original)
        assert original["attachment_ids"] == [(6, 0, [7])]

    def test_bool_is_not_treated_as_int(self):
        # isinstance(True, int) is True in Python; a bool id is nonsense.
        # It yields no valid ids, so nothing is rewritten — we surface the bad
        # value to Odoo rather than silently sending an empty attachment list.
        out = _normalize_attachment_ids({"attachment_ids": [(6, 0, [True])]})
        assert out["attachment_ids"] == [(6, 0, [True])]


class TestOdooCreateForwardsTheNormalizedShape:
    """End-to-end through odoo_create, asserting what reaches the client."""

    def _client(self):
        c = MagicMock()
        c.call_kw.return_value = 999
        return c

    def test_mail_message_command_form_is_converted_before_rpc(self):
        c = self._client()
        odoo_create(c, 19, "mail.message",
                    {"body": "x", "attachment_ids": [(6, 0, [48341])]})
        sent = c.call_kw.call_args
        values = sent.args[2][0] if len(sent.args) > 2 else sent.kwargs["args"][0]
        assert values["attachment_ids"] == [48341], (
            "odoo_create must hand the client a flat list of ids, "
            "otherwise Odoo 17 raises ValueError and the file is lost"
        )

    def test_non_message_models_are_not_rewritten(self):
        # a x2many write on another model legitimately uses the command form
        c = self._client()
        odoo_create(c, 19, "sale.order",
                    {"partner_id": 3, "order_line": [(6, 0, [11])]})
        sent = c.call_kw.call_args
        values = sent.args[2][0] if len(sent.args) > 2 else sent.kwargs["args"][0]
        assert values["order_line"] == [(6, 0, [11])]
