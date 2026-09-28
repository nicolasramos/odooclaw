# © 2026 Nicolás Ramos — MIT License
"""
Feature flag model for per-field and per-user activation of runonweb features.
"""
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class RunonwebFeatureFlag(models.Model):
    _name = "runonweb.feature.flag"
    _description = "runonweb feature flag"
    _order = "sequence, name"

    name = fields.Char(required=True, index=True)
    sequence = fields.Integer(default=10, help="Used to sort feature flags in the list view.")
    module_id = fields.Many2one(
        "ir.module.module",
        string="Module",
        domain="[('state', '=', 'installed')]",
        required=True,
        ondelete="cascade",
    )
    feature_type = fields.Selection(
        [("stt", "Speech-to-text"), ("ocr", "OCR"), ("embed", "Embeddings")],
        string="Feature type",
        required=True,
    )
    field_id = fields.Many2one(
        "ir.model.fields",
        string="Field",
        domain="[('ttype', 'in', ('text', 'html', 'char'))]",
        help="Leave empty to enable for all text fields in the module.",
    )
    field_ref = fields.Char(
        string="Field reference",
        compute="_compute_field_ref",
        help="Technical 'model.name' reference used by the JS feature resolver.",
    )

    @api.depends("field_id")
    def _compute_field_ref(self):
        for rec in self:
            rec.field_ref = (
                "%s.%s" % (rec.field_id.model, rec.field_id.name)
                if rec.field_id
                else False
            )

    user_ids = fields.Many2many(
        "res.users",
        string="Allowed users",
        help="If set, only these users can use this feature. Empty = all users.",
    )
    active = fields.Boolean(default=True)

    _sql_constraints = [
        (
            "feature_flag_uniq",
            "unique(module_id, feature_type, field_id)",
            "A feature flag for this module, feature type, and field must be unique.",
        ),
    ]

    def _check_field_compatibility(self):
        """Validate that the selected field type supports the feature."""
        for rec in self:
            if rec.field_id:
                if rec.feature_type == "stt" and rec.field_id.ttype not in ("char", "text", "html"):
                    raise ValidationError(
                        _("STT requires a char, text, or html field. Field '%s' has type '%s'.")
                        % (rec.field_id.name, rec.field_id.ttype)
                    )
                if rec.feature_type == "ocr" and rec.field_id.ttype not in ("image", "binary"):
                    raise ValidationError(
                        _("OCR requires an image or binary field. Field '%s' has type '%s'.")
                        % (rec.field_id.name, rec.field_id.ttype)
                    )

    @api.constrains("feature_type", "field_id")
    def _constrain_feature_field(self):
        self._check_field_compatibility()

    def toggle_active(self):
        self.write({"active": not self.active})
