from odoo import models


class ResUsers(models.Model):
    _inherit = "res.users"

    def _compute_im_status(self):
        """
        Override to set im_status to 'online' for the OdooClaw bot.
        Useful for Live chat.
        """
        odooclaw_user = self.env.ref(
            "mail_bot_odooclaw.odooclaw_bot", raise_if_not_found=False
        )
        if odooclaw_user and odooclaw_user in self:
            odooclaw_user.im_status = "online"

        to_process = self.filtered(lambda r: not odooclaw_user or r != odooclaw_user)
        if not to_process:
            return
        return super(ResUsers, to_process)._compute_im_status()
