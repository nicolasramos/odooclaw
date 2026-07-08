import uuid
from datetime import timedelta
from odoo import models, fields, api


class MailOdooClawReplyToken(models.Model):
    _name = "mail.odooclaw.reply.token"
    _description = "OdooClaw Reply Token"
    _rec_name = "token"

    token = fields.Char(required=True, index=True, readonly=True)
    model = fields.Char(required=True, readonly=True)
    res_id = fields.Integer(required=True, readonly=True)
    message_id = fields.Many2one("mail.message", ondelete="cascade", readonly=True)
    expiry = fields.Datetime(required=True, readonly=True)
    used = fields.Boolean(default=False)

    @api.model
    def _generate(self, model, res_id, message_id):
        """Generate a single-use reply token for the given record."""
        ttl = int(
            self.env["ir.config_parameter"]
            .sudo()
            .get_param("odooclaw.reply_token_ttl", "300")
        )
        return self.create({
            "token": str(uuid.uuid4()),
            "model": model,
            "res_id": res_id,
            "message_id": message_id,
            "expiry": fields.Datetime.now() + timedelta(seconds=ttl),
        })

    @api.model
    def _validate(self, token_str, model, res_id):
        """
        Validate a reply token and mark it as used (single-use).
        Returns the token record if valid (truthy), empty recordset otherwise (falsy).
        """
        record = self.sudo().search([
            ("token", "=", token_str),
            ("used", "=", False),
            ("expiry", ">", fields.Datetime.now()),
            ("model", "=", model),
            ("res_id", "=", res_id),
        ], limit=1)
        record.used = True
        return record

    @api.model
    def _cleanup_expired(self):
        """Cron: remove expired and consumed tokens."""
        self.sudo().search([
            "|",
            ("expiry", "<", fields.Datetime.now()),
            ("used", "=", True),
        ]).unlink()
