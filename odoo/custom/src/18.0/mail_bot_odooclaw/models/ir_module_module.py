import logging
import threading
import requests
from odoo import models

_logger = logging.getLogger(__name__)


class IrModuleModule(models.Model):
    _inherit = "ir.module.module"

    def button_immediate_install(self):
        result = super().button_immediate_install()

        webhook_url = (
            self.env["ir.config_parameter"]
            .sudo()
            .get_param("odooclaw.webhook_url")
        )
        if not webhook_url:
            return result

        for module in self:
            t = threading.Thread(
                target=self._notify_odooclaw_module_installed,
                args=(module.name, module.shortdesc, webhook_url),
            )
            t.daemon = True
            t.start()
        return result

    def _notify_odooclaw_module_installed(self, module_name, module_display_name, webhook_url):
        try:
            payload = {
                "is_dm": True,
                "body": (
                    f"System task - no reply needed: The Odoo module '{module_name}' "
                    f"({module_display_name}) has just been installed. "
                    f"Use odoo_search on ir.model to discover its models, then "
                    f"use the write_file tool to append a summary to "
                    f"/home/odooclaw/.odooclaw/workspace/memory/MODULES.md. "
                    f"Format: ## {module_name}\\n- model: description\\n. "
                    f"Do not reply, just write the file."
                ),
                "author_id": 1,
                "author_user_id": 1,
                "author_name": "Odoo System",
                "company_id": 1,
                "allowed_company_ids": [1],
                "model": "",
                "res_id": 0,
                "reply_model": "",
                "reply_res_id": 0,
                "voice_attachments": [],
                "invoice_attachments": [],
                "attachments": [],
            }

            def send_webhook(url, data):
                try:
                    requests.post(
                        url,
                        json=data,
                        headers={"Content-Type": "application/json"},
                        timeout=5,
                    )
                except Exception as e:
                    _logger.error(
                        "OdooClaw: failed to send webhook: %s", e
                    )

            threading.Thread(
                target=send_webhook, args=(webhook_url, payload)
            ).start()

        except Exception:
            _logger.exception(
                "OdooClaw: error notifying module installation for %s",
                module_name,
            )
