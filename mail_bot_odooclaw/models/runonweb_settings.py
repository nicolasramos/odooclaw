# © 2026 Nicolás Ramos — MIT License
"""
Configuration model for runonweb integration.
Stores the fixed runonweb version and module-level settings.
"""
from odoo import api, fields, models


class RunonwebSettings(models.TransientModel):
    _name = "runonweb.settings"
    _description = "runonweb integration settings"

    runonweb_version = fields.Char(
        string="runonweb version",
        default="0.0.1",
        required=True,
        help="Exact version of the runonweb npm package to load.",
    )
    enable_stt = fields.Boolean(
        string="Enable speech-to-text",
        default=False,
        help="Globally enable STT features when feature flags allow.",
    )
    enable_ocr = fields.Boolean(
        string="Enable OCR",
        default=False,
        help="Globally enable OCR features when feature flags allow.",
    )
    enable_embed = fields.Boolean(
        string="Enable embeddings",
        default=False,
        help="Globally enable embedding features when feature flags allow.",
    )
    default_device = fields.Selection(
        [("auto", "Auto (WebGPU when available, else WASM)"), ("webgpu", "WebGPU"), ("wasm", "WASM")],
        string="Default inference device",
        default="auto",
        help="Fallback device when user has no explicit preference.",
    )
    model_cache_dir = fields.Char(
        string="Model cache directory",
        default="",
        help="Optional server-side path for model caching (unused when using browser cache).",
    )

    @api.model
    def get_default_settings(self):
        """Return default settings as a dict for JS consumption."""
        return {
            "runonweb_version": self.runonweb_version,
            "enable_stt": self.enable_stt,
            "enable_ocr": self.enable_ocr,
            "enable_embed": self.enable_embed,
            "default_device": self.default_device,
        }

    @api.model
    def current_user_id(self):
        """Return current user ID for feature flag resolution."""
        return self.env.uid
