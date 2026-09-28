# © 2026 Nicolás Ramos — MIT License
"""
Configuration model for runonweb integration.
Stores the fixed runonweb version and module-level settings persistently.
"""
from odoo import api, fields, models


class RunonwebSettings(models.Model):
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
    def _get_single_record(self):
        """Return the single persistent settings record, creating it if needed."""
        rec = self.search([], limit=1)
        if not rec:
            rec = self.create({})
        return rec

    @api.model
    def get_default_settings(self):
        """Return current settings as a dict for JS consumption."""
        rec = self._get_single_record()
        return {
            "runonweb_version": rec.runonweb_version,
            "enable_stt": rec.enable_stt,
            "enable_ocr": rec.enable_ocr,
            "enable_embed": rec.enable_embed,
            "default_device": rec.default_device,
        }

    @api.model
    def current_user_id(self):
        """Return current user ID for feature flag resolution."""
        return self.env.uid
