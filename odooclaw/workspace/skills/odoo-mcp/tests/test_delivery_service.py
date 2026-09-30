"""Regression tests for delivering a generated file to the chat (NRA-3737).

The bug this covers, measured on the `ecosystem` client: the agent generated an
Excel report, then told the user

    📄 Archivo local: /opt/odooclaw/workspace/exports/horas_septiembre_2026.xlsx

That is not delivery. The path exists only inside the gateway's filesystem; the
user cannot open it, and no attachment ever reached the thread. The Excel did
exist as an `ir.attachment` but with `res_model`/`res_id` empty — orphaned,
never linked to any message.

Two facts drive the fix, both measured against a real Odoo 17:

1. `message_post` needs the attachment to exist first, and needs
   `attachment_ids` as a LITERAL LIST OF INTS. The x2many command form
   `[(6, 0, [id])]` raises ValueError before the message exists — the same trap
   `odoo_create` already normalises for `mail.message`.
2. An attachment with empty `res_model`/`res_id` is invisible in the chatter;
   it must be created against the thread it is posted to.

Bidirectional control: the shape test fails if `attach_file_to_chat` is
rewritten to pass the command form, and the "no path is ever returned" test
fails if the tool starts handing back a filesystem path instead of the file.
"""

import base64
from unittest.mock import MagicMock

import pytest

from odoo_mcp.services.delivery_service import (
    ATTACHMENT_MODEL,
    MAX_UPLOAD_BYTES,
    attach_file_to_chat,
)


def _client(monkeypatch):
    """A client whose call_kw records every call and returns sane ids."""
    client = MagicMock()
    client.call_kw.return_value = 4242
    # guard_model_access consults the allowlist; let everything through so the
    # test is about the delivery shape, not about policy.
    monkeypatch.setattr(
        "odoo_mcp.services.delivery_service.guard_model_access", lambda *a, **k: None
    )
    return client


class TestAttachFileToChat:
    def test_attachment_is_created_against_the_thread(self, monkeypatch):
        client = _client(monkeypatch)
        content = base64.b64encode(b"hola").decode()

        attach_file_to_chat(
            client,
            19,
            "discuss.channel",
            19,
            filename="informe.xlsx",
            content_base64=content,
            mimetype="application/vnd.ms-excel",
        )

        create_call = client.call_kw.call_args_list[0]
        assert create_call.args[0] == ATTACHMENT_MODEL
        assert create_call.args[1] == "create"
        values = create_call.kwargs["args"][0]
        # Without res_model/res_id the attachment is orphaned: it exists in
        # ir_attachment but appears on no thread.
        assert values["res_model"] == "discuss.channel"
        assert values["res_id"] == 19
        assert values["name"] == "informe.xlsx"
        assert values["datas"] == content

    def test_message_post_receives_a_flat_list_of_int_ids(self, monkeypatch):
        client = _client(monkeypatch)
        client.call_kw.side_effect = [48341, 1285054]

        attach_file_to_chat(
            client,
            19,
            "discuss.channel",
            19,
            filename="informe.xlsx",
            content_base64=base64.b64encode(b"x").decode(),
        )

        post_call = client.call_kw.call_args_list[1]
        assert post_call.args[0] == "discuss.channel"
        assert post_call.args[1] == "message_post"
        ids = post_call.kwargs["kwargs"]["attachment_ids"]
        # Odoo 17: the command form raises ValueError, nothing is created.
        assert ids == [48341]
        assert not any(isinstance(i, (list, tuple)) for i in ids), (
            "x2many command form [(6, 0, [id])] is rejected by message_post"
        )

    def test_never_returns_or_mentions_a_filesystem_path(self, monkeypatch):
        client = _client(monkeypatch)
        result = attach_file_to_chat(
            client,
            19,
            "discuss.channel",
            19,
            filename="informe.xlsx",
            content_base64=base64.b64encode(b"x").decode(),
        )
        blob = repr(result)
        assert "/opt/" not in blob and "workspace" not in blob
        assert result["filename"] == "informe.xlsx"

    def test_optional_mimetype_is_omitted_when_absent(self, monkeypatch):
        client = _client(monkeypatch)
        attach_file_to_chat(
            client,
            19,
            "discuss.channel",
            19,
            filename="notas.txt",
            content_base64=base64.b64encode(b"x").decode(),
        )
        values = client.call_kw.call_args_list[0].kwargs["args"][0]
        assert "mimetype" not in values


class TestRejectsBeforeTouchingOdoo:
    def test_invalid_base64_is_refused(self, monkeypatch):
        client = _client(monkeypatch)
        with pytest.raises(ValueError, match="base64"):
            attach_file_to_chat(
                client,
                19,
                "discuss.channel",
                19,
                filename="x.txt",
                content_base64="???not-base64???",
            )
        assert client.call_kw.call_count == 0

    def test_missing_filename_is_refused(self, monkeypatch):
        client = _client(monkeypatch)
        with pytest.raises(ValueError, match="filename"):
            attach_file_to_chat(
                client,
                19,
                "discuss.channel",
                19,
                filename="",
                content_base64=base64.b64encode(b"x").decode(),
            )
        assert client.call_kw.call_count == 0

    def test_oversized_file_is_refused_using_decoded_size(self, monkeypatch):
        client = _client(monkeypatch)
        # 3 bytes of base64 inflate to 4 chars, so a limit check on the encoded
        # string would wrongly reject a file that is exactly within the limit.
        payload = base64.b64encode(b"a" * 12).decode()
        with pytest.raises(ValueError, match="over the"):
            attach_file_to_chat(
                client,
                19,
                "discuss.channel",
                19,
                filename="big.bin",
                content_base64=payload,
                max_bytes=10,
            )
        assert client.call_kw.call_count == 0

    def test_file_exactly_at_the_limit_is_accepted(self, monkeypatch):
        client = _client(monkeypatch)
        attach_file_to_chat(
            client,
            19,
            "discuss.channel",
            19,
            filename="ok.bin",
            content_base64=base64.b64encode(b"a" * 10).decode(),
            max_bytes=10,
        )
        assert client.call_kw.call_count == 2

    def test_default_limit_is_bounded(self):
        assert MAX_UPLOAD_BYTES == 25 * 1024 * 1024
