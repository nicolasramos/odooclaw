# © 2026 Nicolás Ramos — MIT License
"""Tests for the client-side OCR text carried on ir.attachment (NRA-3968)."""
from odoo.exceptions import UserError
from odoo.tests import TransactionCase, tagged


@tagged("mail_bot_odooclaw")
class TestAttachmentClientOcr(TransactionCase):
    """Test ir.attachment.runonweb_ocr_text + store_client_ocr."""

    def setUp(self):
        super().setUp()
        self.Attachment = self.env["ir.attachment"]
        self.Settings = self.env["runonweb.settings"]
        # Enable the OCR kill-switch on the singleton settings record.
        self.settings = self.Settings._get_single_record()
        self.settings.write({"enable_ocr": True})

    def _make_attachment(self):
        return self.Attachment.create(
            {
                "name": "factura.png",
                "mimetype": "image/png",
                "raw": b"fake-png-bytes",
                "res_model": "mail.thread",
                "res_id": self.env.user.id,
            }
        )

    def test_01_fields_exist_and_default_empty(self):
        att = self._make_attachment()
        self.assertFalse(att.runonweb_ocr_text)
        self.assertEqual(att.runonweb_ocr_confidence, 0.0)
        self.assertFalse(att.runonweb_ocr_at)

    def test_02_store_client_ocr_happy_path(self):
        att = self._make_attachment()
        res = self.Attachment.store_client_ocr(att.id, "FACTURA 001\nTotal 121,00", 0.87)
        self.assertTrue(res)
        att.invalidate_recordset()
        self.assertIn("FACTURA 001", att.runonweb_ocr_text)
        self.assertAlmostEqual(att.runonweb_ocr_confidence, 0.87)
        self.assertTrue(att.runonweb_ocr_at)

    def test_03_store_rejects_empty_text(self):
        att = self._make_attachment()
        with self.assertRaises(UserError):
            self.Attachment.store_client_ocr(att.id, "   ")

    def test_04_store_rejects_unknown_attachment(self):
        with self.assertRaises(UserError):
            self.Attachment.store_client_ocr(999999, "texto", 0.5)

    def test_05_store_rejects_invalid_id(self):
        with self.assertRaises(UserError):
            self.Attachment.store_client_ocr("no-es-int", "texto", 0.5)

    def test_06_store_rejects_oversized_text(self):
        att = self._make_attachment()
        huge = "x" * 200_001
        with self.assertRaises(UserError):
            self.Attachment.store_client_ocr(att.id, huge, 0.5)

    def test_07_store_fails_closed_when_ocr_disabled(self):
        # Kill-switch off: the write must be refused.
        self.settings.write({"enable_ocr": False})
        att = self._make_attachment()
        with self.assertRaises(UserError):
            self.Attachment.store_client_ocr(att.id, "texto", 0.5)

    def test_08_confidence_clamped(self):
        att = self._make_attachment()
        self.Attachment.store_client_ocr(att.id, "texto", 42.0)
        att.invalidate_recordset()
        self.assertEqual(att.runonweb_ocr_confidence, 1.0)
        self.Attachment.store_client_ocr(att.id, "texto", -5.0)
        att.invalidate_recordset()
        self.assertEqual(att.runonweb_ocr_confidence, 0.0)

    def test_09_ocr_text_not_copied_on_duplicate(self):
        """copy=False: duplicating an attachment must not carry stale OCR text."""
        att = self._make_attachment()
        self.Attachment.store_client_ocr(att.id, "FACTURA ORIGINAL", 0.9)
        dup = att.copy()
        self.assertFalse(dup.runonweb_ocr_text)

    def test_10_numeric_string_id_accepted(self):
        """The JS layer sends Number(id); tolerate numeric strings too."""
        att = self._make_attachment()
        self.Attachment.store_client_ocr(str(att.id), "texto", 0.5)
        att.invalidate_recordset()
        self.assertEqual(att.runonweb_ocr_text, "texto")

    def test_11_provenance_recorded(self):
        """runonweb_ocr_uid must record who stored the text."""
        att = self._make_attachment()
        self.Attachment.store_client_ocr(att.id, "texto", 0.5)
        att.invalidate_recordset()
        self.assertEqual(att.runonweb_ocr_uid, self.env.user)

    def test_12_non_internal_user_rejected(self):
        """Portal users cannot store client OCR (pipeline-input trust)."""
        portal_user = self.env["res.users"].create(
            {
                "name": "Portal Tester",
                "login": "nra3968_portal",
                "email": "portal@nra3968.test",
                "groups_id": [(6, 0, [self.env.ref("base.group_portal").id])],
            }
        )
        att = self._make_attachment()
        with self.assertRaises(UserError):
            self.Attachment.with_user(portal_user).store_client_ocr(att.id, "texto", 0.5)
