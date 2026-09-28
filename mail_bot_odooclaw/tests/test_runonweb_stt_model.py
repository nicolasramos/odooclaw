"""Tests for runonweb STT model configuration."""
# © 2026 Nicolás Ramos — MIT License
from odoo.exceptions import ValidationError
from odoo.tests import TransactionCase, tagged


@tagged("-standard", "mail_bot_odooclaw")
class TestRunonwebSttModel(TransactionCase):
    """Test runonweb.stt.model model."""

    def setUp(self):
        super().setUp()
        self.SttModel = self.env["runonweb.stt.model"]

    def test_01_create_stt_model(self):
        """Test creating an STT model record."""
        model = self.SttModel.create({
            "name": "test-whisper",
            "model_type": "whisper-tiny",
            "is_multilingual": True,
            "size_mb": 75,
            "quality_rating": "low",
            "is_default": True,
            "sample_rate": 16000,
            "encoder_url": "/models/encoder.onnx",
            "decoder_url": "/models/decoder.onnx",
            "tokens_url": "/models/tokens.txt",
        })
        self.assertEqual(model.name, "test-whisper")
        self.assertEqual(model.model_type, "whisper-tiny")
        self.assertTrue(model.is_multilingual)
        self.assertEqual(model.size_mb, 75)
        self.assertTrue(model.is_default)
        self.assertEqual(model.sample_rate, 16000)

    def test_02_default_model_selection(self):
        """Test get_default_model returns the marked default."""
        default_model = self.SttModel.create({
            "name": "default-model",
            "model_type": "whisper-tiny",
            "is_multilingual": True,
            "size_mb": 75,
            "is_default": True,
        })
        result = self.SttModel.get_default_model()
        self.assertEqual(result.name, "default-model")

    def test_03_get_default_model_fallback_multilingual(self):
        """Test get_default_model falls back to first multilingual."""
        non_default = self.SttModel.create({
            "name": "non-default",
            "model_type": "whisper-base",
            "is_multilingual": True,
            "size_mb": 142,
            "is_default": False,
        })
        result = self.SttModel.get_default_model()
        self.assertEqual(result.name, "non-default")

    def test_04_get_default_model_fallback_any(self):
        """Test get_default_model falls back to any model if no default."""
        any_model = self.SttModel.create({
            "name": "any-model",
            "model_type": "whisper-tiny",
            "is_multilingual": False,
            "size_mb": 75,
            "is_default": False,
        })
        result = self.SttModel.get_default_model()
        self.assertEqual(result.name, "any-model")

    def test_05_only_one_default(self):
        """Test that only one model can be marked as default."""
        first = self.SttModel.create({
            "name": "first-default",
            "model_type": "whisper-tiny",
            "is_multilingual": True,
            "size_mb": 75,
            "is_default": True,
        })
        second = self.SttModel.create({
            "name": "second-default",
            "model_type": "whisper-base",
            "is_multilingual": True,
            "size_mb": 142,
            "is_default": True,
        })
        with self.assertRaises(ValidationError):
            # Try to create another default — should fail
            self.SttModel.create({
                "name": "third-default",
                "model_type": "whisper-small",
                "is_multilingual": True,
                "size_mb": 466,
                "is_default": True,
            })
        # But we can deactivate the first and activate the second
        first.write({"is_default": False})
        second.write({"is_default": True})
        result = self.SttModel.get_default_model()
        self.assertEqual(result.name, "second-default")

    def test_06_unique_name_constraint(self):
        """Test that model names must be unique."""
        self.SttModel.create({
            "name": "unique-test",
            "model_type": "whisper-tiny",
            "is_multilingual": True,
            "size_mb": 75,
        })
        with self.assertRaises(ValidationError):
            self.SttModel.create({
                "name": "unique-test",  # Duplicate name
                "model_type": "whisper-base",
                "is_multilingual": True,
                "size_mb": 142,
            })

    def test_07_get_model_files(self):
        """Test get_model_files returns correct dict."""
        model = self.SttModel.create({
            "name": "files-test",
            "model_type": "whisper-tiny",
            "is_multilingual": True,
            "size_mb": 75,
            "encoder_url": "/models/enc.onnx",
            "decoder_url": "/models/dec.onnx",
            "tokens_url": "/models/tok.txt",
        })
        files = self.SttModel.get_model_files(model)
        self.assertIn("encoder", files)
        self.assertIn("decoder", files)
        self.assertIn("tokens", files)
        self.assertEqual(files["encoder"], "/models/enc.onnx")
        self.assertEqual(files["decoder"], "/models/dec.onnx")
        self.assertEqual(files["tokens"], "/models/tok.txt")

    def test_08_compute_display_name(self):
        """Test display_name computation."""
        mono = self.SttModel.create({
            "name": "mono-model",
            "model_type": "whisper-tiny",
            "is_multilingual": False,
            "size_mb": 75,
        })
        self.assertEqual(mono.display_name, "whisper-tiny")

        multi = self.SttModel.create({
            "name": "multi-model",
            "model_type": "whisper-base",
            "is_multilingual": True,
            "size_mb": 142,
        })
        self.assertEqual(multi.display_name, "whisper-base · multilingual")

    def test_09_search_ordered_by_sequence(self):
        """Test that models are ordered by sequence."""
        high_seq = self.SttModel.create({
            "name": "high-seq",
            "model_type": "whisper-tiny",
            "is_multilingual": True,
            "size_mb": 75,
            "sequence": 20,
        })
        low_seq = self.SttModel.create({
            "name": "low-seq",
            "model_type": "whisper-base",
            "is_multilingual": True,
            "size_mb": 142,
            "sequence": 10,
        })
        models = self.SttModel.search([], order="sequence")
        self.assertEqual(models[0].name, "low-seq")
        self.assertEqual(models[1].name, "high-seq")

    def test_10_seed_default_models(self):
        """Test _seed_default_models creates default models on empty DB."""
        # Clear all existing models
        self.SttModel.search([]).unlink()
        # Call seed
        self.SttModel._seed_default_models()
        # Should have 4 default models
        models = self.SttModel.search([])
        self.assertEqual(len(models), 4)
        model_names = models.mapped("name")
        self.assertIn("whisper-tiny", model_names)
        self.assertIn("whisper-base", model_names)
        self.assertIn("whisper-small", model_names)
        self.assertIn("whisper-medium", model_names)
        # Verify tiny is default
        default = self.SttModel.get_default_model()
        self.assertEqual(default.name, "whisper-tiny")
        self.assertTrue(default.is_multilingual)
