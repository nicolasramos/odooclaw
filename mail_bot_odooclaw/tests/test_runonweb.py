"""Tests for mail_bot_odooclaw module."""
# © 2026 Nicolás Ramos — MIT License
from odoo.tests import TransactionCase, tagged
from odoo.tools import mute_logger


@tagged("mail_bot_odooclaw")
class TestRunonwebSettings(TransactionCase):
    """Test runonweb.settings model."""

    def setUp(self):
        super().setUp()
        self.Settings = self.env["runonweb.settings"]

    def test_01_default_settings(self):
        """Test default settings values."""
        settings = self.Settings.create({})
        self.assertEqual(settings.runonweb_version, "0.0.1")
        self.assertFalse(settings.enable_stt)
        self.assertFalse(settings.enable_ocr)
        self.assertFalse(settings.enable_embed)
        self.assertEqual(settings.default_device, "auto")

    def test_02_get_default_settings(self):
        """Test get_default_settings returns dict."""
        settings = self.Settings.create({})
        result = settings.get_default_settings()
        self.assertIsInstance(result, dict)
        self.assertIn("runonweb_version", result)
        self.assertIn("enable_stt", result)
        self.assertIn("enable_ocr", result)
        self.assertIn("enable_embed", result)
        self.assertIn("default_device", result)

    def test_03_current_user_id(self):
        """Test current_user_id returns uid."""
        settings = self.Settings.create({})
        uid = settings.current_user_id()
        self.assertEqual(uid, self.env.uid)

    def test_04_persistent_record_reuse(self):
        """Test that get_default_settings reuses the single persistent record."""
        rec1 = self.Settings._get_single_record()
        rec2 = self.Settings._get_single_record()
        self.assertEqual(rec1.id, rec2.id)

    def test_05_settings_persist_values(self):
        """Test that settings persist across get_default_settings calls."""
        rec = self.Settings._get_single_record()
        rec.write({"enable_stt": True, "default_device": "wasm"})
        result = rec.get_default_settings()
        self.assertTrue(result["enable_stt"])
        self.assertEqual(result["default_device"], "wasm")


@tagged("mail_bot_odooclaw")
class TestRunonwebFeatureFlag(TransactionCase):
    """Test runonweb.feature.flag model."""

    def setUp(self):
        super().setUp()
        self.Flag = self.env["runonweb.feature.flag"]
        self.module = self.env["ir.module.module"].search(
            [("name", "=", "mail")], limit=1
        )
        self.user = self.env.user

    def test_01_create_flag(self):
        """Test creating a feature flag."""
        flag = self.Flag.create(
            {
                "name": "Test STT Flag",
                "module_id": self.module.id,
                "feature_type": "stt",
            }
        )
        self.assertEqual(flag.name, "Test STT Flag")
        self.assertEqual(flag.feature_type, "stt")
        self.assertTrue(flag.active)

    def test_02_flag_with_user_restriction(self):
        """Test feature flag with user restriction."""
        other_user = self.env["res.users"].create(
            {
                "name": "Test User",
                "login": "test_user_flag",
                "email": "test@example.com",
                "groups_id": [(4, self.env.ref("base.group_user").id)],
            }
        )
        flag = self.Flag.create(
            {
                "name": "Restricted STT",
                "module_id": self.module.id,
                "feature_type": "stt",
                "user_ids": [(4, other_user.id)],
            }
        )
        self.assertNotIn(self.user, flag.user_ids)

    def test_03_toggle_active(self):
        """Test toggling feature flag active state."""
        flag = self.Flag.create(
            {
                "name": "Test Toggle",
                "module_id": self.module.id,
                "feature_type": "ocr",
            }
        )
        self.assertTrue(flag.active)
        flag.toggle_active()
        self.assertFalse(flag.active)
        flag.toggle_active()
        self.assertTrue(flag.active)

    def test_04_unique_constraint(self):
        """Test unique constraint on module+feature_type+field."""
        field = self.env["ir.model.fields"].search(
            [("model", "=", "mail.message"), ("name", "=", "body")], limit=1
        )
        self.Flag.create(
            {
                "name": "Flag 1",
                "module_id": self.module.id,
                "feature_type": "stt",
                "field_id": field.id if field else False,
            }
        )
        with mute_logger("odoo.sql_db"):
            with self.assertRaises(Exception):
                self.Flag.create(
                    {
                        "name": "Flag 2",
                        "module_id": self.module.id,
                        "feature_type": "stt",
                        "field_id": field.id if field else False,
                    }
                )

    def test_05_stt_requires_text_field(self):
        """Test that STT requires a text-compatible field."""
        # Find a binary field (should fail for STT)
        binary_field = self.env["ir.model.fields"].search(
            [("model", "=", "ir.attachment"), ("name", "=", "datas")], limit=1
        )
        if binary_field:
            with mute_logger("odoo.sql_db"):
                with self.assertRaises(Exception):
                    self.Flag.create(
                        {
                            "name": "Invalid STT",
                            "module_id": self.module.id,
                            "feature_type": "stt",
                            "field_id": binary_field.id,
                        }
                    )

    def test_06_feature_flag_ordering(self):
        """Test that feature flags are ordered by sequence."""
        flag1 = self.Flag.create(
            {
                "name": "Flag 1",
                "module_id": self.module.id,
                "feature_type": "stt",
                "sequence": 20,
            }
        )
        flag2 = self.Flag.create(
            {
                "name": "Flag 2",
                "module_id": self.module.id,
                "feature_type": "ocr",
                "sequence": 10,
            }
        )
        flags = self.Flag.search([], order="sequence")
        self.assertEqual(flags[0].name, "Flag 2")
        self.assertEqual(flags[1].name, "Flag 1")
