import logging
import requests
import json
import threading
from odoo import models, api, tools, _

_logger = logging.getLogger(__name__)


class MailThread(models.AbstractModel):
    _inherit = "mail.thread"

    @api.returns("mail.message", lambda value: value.id)
    def message_post(self, **kwargs):
        message = super(MailThread, self).message_post(**kwargs)

        # Determine if OdooClaw is mentioned or it's a direct message to OdooClaw
        odooclaw_user = self.env.ref(
            "mail_bot_odooclaw.odooclaw_bot", raise_if_not_found=False
        )
        if not odooclaw_user:
            return message

        # Prevent infinite loops (don't reply to ourselves)
        if message.author_id == odooclaw_user.partner_id:
            return message

        odooclaw_partner_id = odooclaw_user.partner_id.id
        is_mentioned = odooclaw_partner_id in message.partner_ids.ids

        # If it's a channel, check if it's a DM with OdooClaw
        is_dm = False
        if message.model == "discuss.channel":
            channel = self.env["discuss.channel"].browse(message.res_id)
            if (
                channel.channel_type == "chat"
                and odooclaw_partner_id
                in channel.channel_member_ids.mapped("partner_id").ids
            ):
                is_dm = True

        if is_mentioned or is_dm:
            # We must clean the text (remove html tags usually added by odoo)
            body_text = tools.html2plaintext(message.body)

            # Process attachments - include voice messages and invoices info
            voice_attachments = []
            invoice_attachments = []
            other_attachments = []

            if message.attachment_ids:
                for att in message.attachment_ids:
                    mimetype = (att.mimetype or "").lower()
                    name = (att.name or "").lower()

                    # Check if it's a voice attachment
                    if att.voice_ids:
                        voice_attachments.append(
                            {"id": att.id, "name": att.name, "mimetype": att.mimetype}
                        )
                        body_text += f"\n🎤 [Nota de voz: {att.name} (ID: {att.id})]\n"
                    # Check if it's a PDF or image (potential invoice)
                    elif (
                        mimetype == "application/pdf"
                        or mimetype.startswith("image/")
                        or name.endswith((".pdf", ".jpg", ".jpeg", ".png", ".webp"))
                    ):
                        invoice_attachments.append(
                            {"id": att.id, "name": att.name, "mimetype": att.mimetype}
                        )
                        body_text += (
                            f"\n🧾 [Factura/Documento: {att.name} (ID: {att.id})]\n"
                        )
                    else:
                        other_attachments.append(
                            {"id": att.id, "name": att.name, "mimetype": att.mimetype}
                        )
                        body_text += f"\n[Adjunto: {att.name} (ID: {att.id})]\n"

            # Send webhook asynchronously
            payload = {
                "message_id": message.id,
                "model": message.model,
                "res_id": message.res_id,
                "author_id": message.author_id.id,
                "author_name": message.author_id.name,
                "body": body_text,
                "is_dm": is_dm,
                "voice_attachments": voice_attachments,
                "invoice_attachments": invoice_attachments,
                "attachments": other_attachments,
            }

            # We use threading to not block the current transaction
            webhook_url = (
                self.env["ir.config_parameter"]
                .sudo()
                .get_param("odooclaw.webhook_url", "http://odooclaw:18790/webhook/odoo")
            )

            def send_webhook(url, data):
                try:
                    headers = {"Content-Type": "application/json"}
                    requests.post(url, json=data, headers=headers, timeout=5)
                except Exception as e:
                    _logger.error("Failed to send webhook to OdooClaw: %s", str(e))

            threaded_call = threading.Thread(
                target=send_webhook, args=(webhook_url, payload)
            )
            threaded_call.start()

            # Trigger "typing..." indicator if it's a discuss channel
            if message.model == "discuss.channel":
                channel = self.env["discuss.channel"].browse(message.res_id)
                bot_member = channel.channel_member_ids.filtered(
                    lambda m: m.partner_id.id == odooclaw_partner_id
                )
                if bot_member:
                    bot_member.sudo()._notify_typing(is_typing=True)

        return message
