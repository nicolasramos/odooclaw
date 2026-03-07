from odoo import models


class ResPartner(models.Model):
    _inherit = "res.partner"

    def _compute_im_status(self):
        """
        Override to set im_status to 'online' for the OdooClaw bot.
        It will be shown in general chatter as online.
        """
        odooclaw_user = self.env.ref(
            "mail_bot_odooclaw.odooclaw_bot", raise_if_not_found=False
        )
        if odooclaw_user:
            odooclaw_partner = odooclaw_user.partner_id
            if odooclaw_partner in self:
                odooclaw_partner.im_status = "online"
                
        to_process = self.filtered(lambda r: not odooclaw_user or r != odooclaw_user.partner_id)
        if not to_process:
            return
        return super(ResPartner, to_process)._compute_im_status()
