# © 2026 Nicolás Ramos — MIT License
"""
Model for STT model selection and configuration.
Stores which Whisper model to use for dictation.
"""
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class RunonwebSttModel(models.Model):
    _name = "runonweb.stt.model"
    _description = "runonweb STT model configuration"
    _order = "size_mb asc, name"

    name = fields.Char(required=True, index=True)
    display_name = fields.Char(
        string="Display name",
        compute="_compute_display_name",
        store=True,
    )
    model_type = fields.Selection(
        [
            ("whisper-tiny", "Whisper Tiny"),
            ("whisper-base", "Whisper Base"),
            ("whisper-small", "Whisper Small"),
            ("whisper-medium", "Whisper Medium"),
        ],
        string="Model type",
        required=True,
        default="whisper-tiny",
    )
    is_multilingual = fields.Boolean(
        string="Multilingual",
        default=False,
        help="Supports languages other than English.",
    )
    size_mb = fields.Integer(
        string="Size (MB)",
        default=75,
        help="Approximate download size in megabytes.",
    )
    quality_rating = fields.Selection(
        [
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High"),
            ("very_high", "Very High"),
        ],
        string="Quality",
        default="medium",
    )
    encoder_url = fields.Char(
        string="Encoder URL",
        help="URL to the ONNX encoder model file.",
    )
    decoder_url = fields.Char(
        string="Decoder URL",
        help="URL to the ONNX decoder model file.",
    )
    tokens_url = fields.Char(
        string="Tokens URL",
        help="URL to the tokens text file.",
    )
    sample_rate = fields.Integer(
        string="Sample rate (Hz)",
        default=16000,
        help="Audio sample rate for transcription.",
    )
    is_default = fields.Boolean(
        string="Default model",
        default=False,
        help="When True, this model is used by default for dictation.",
    )
    active = fields.Boolean(default=True)

    _sql_constraints = [
        (
            "name_uniq",
            "UNIQUE(name)",
            "Model name must be unique.",
        ),
        (
            "only_one_default",
            "CHECK(is_default = TRUE OR is_default = FALSE)",
            "Only one default model allowed.",
        ),
    ]

    @api.depends("name", "model_type", "is_multilingual")
    def _compute_display_name(self):
        for rec in self:
            parts = [rec.model_type]
            if rec.is_multilingual:
                parts.append("multilingual")
            rec.display_name = " · ".join(parts)

    @api.constrains("is_default")
    def _constrain_default_model(self):
        """Ensure only one default model exists."""
        for rec in self:
            if rec.is_default:
                others = self.search(
                    [("id", "!=", rec.id), ("is_default", "=", True)]
                )
                if others:
                    raise ValidationError(
                        _(
                            "Only one model can be the default. "
                            "Please deactivate the current default first."
                        )
                    )

    @api.model
    def get_default_model(self):
        """Return the default STT model."""
        default = self.search([("is_default", "=", True)], limit=1)
        if default:
            return default
        # Fallback to first multilingual model
        fallback = self.search(
            [("is_multilingual", "=", True)],
            order="size_mb asc",
            limit=1,
        )
        if fallback:
            return fallback
        # Ultimate fallback
        return self.search([], order="size_mb asc", limit=1)

    @api.model
    def get_model_files(self, model):
        """Return model files dict for STT loadModel."""
        return {
            "encoder": model.encoder_url,
            "decoder": model.decoder_url,
            "tokens": model.tokens_url,
        }

    @api.model
    def _auto_init(self):
        """Auto-initialize default STT models on module install."""
        result = super()._auto_init()
        self._seed_default_models()
        return result

    @api.model
    def _seed_default_models(self):
        """Seed default Whisper models if none exist."""
        existing = self.search([])
        if existing:
            return

        models_data = [
            {
                "name": "whisper-tiny",
                "model_type": "whisper-tiny",
                "is_multilingual": True,
                "size_mb": 75,
                "quality_rating": "low",
                "is_default": True,
                "sample_rate": 16000,
                "encoder_url": "/mail_bot_odooclaw/static/src/js/models/whisper-tiny-encoder.onnx",
                "decoder_url": "/mail_bot_odooclaw/static/src/js/models/whisper-tiny-decoder.onnx",
                "tokens_url": "/mail_bot_odooclaw/static/src/js/models/whisper-tiny-tokens.txt",
            },
            {
                "name": "whisper-base",
                "model_type": "whisper-base",
                "is_multilingual": True,
                "size_mb": 142,
                "quality_rating": "medium",
                "is_default": False,
                "sample_rate": 16000,
                "encoder_url": "/mail_bot_odooclaw/static/src/js/models/whisper-base-encoder.onnx",
                "decoder_url": "/mail_bot_odooclaw/static/src/js/models/whisper-base-decoder.onnx",
                "tokens_url": "/mail_bot_odooclaw/static/src/js/models/whisper-base-tokens.txt",
            },
            {
                "name": "whisper-small",
                "model_type": "whisper-small",
                "is_multilingual": True,
                "size_mb": 466,
                "quality_rating": "high",
                "is_default": False,
                "sample_rate": 16000,
                "encoder_url": "/mail_bot_odooclaw/static/src/js/models/whisper-small-encoder.onnx",
                "decoder_url": "/mail_bot_odooclaw/static/src/js/models/whisper-small-decoder.onnx",
                "tokens_url": "/mail_bot_odooclaw/static/src/js/models/whisper-small-tokens.txt",
            },
            {
                "name": "whisper-medium",
                "model_type": "whisper-medium",
                "is_multilingual": True,
                "size_mb": 1500,
                "quality_rating": "very_high",
                "is_default": False,
                "sample_rate": 16000,
                "encoder_url": "/mail_bot_odooclaw/static/src/js/models/whisper-medium-encoder.onnx",
                "decoder_url": "/mail_bot_odooclaw/static/src/js/models/whisper-medium-decoder.onnx",
                "tokens_url": "/mail_bot_odooclaw/static/src/js/models/whisper-medium-tokens.txt",
            },
        ]

        for data in models_data:
            self.create(data)
