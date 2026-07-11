{
    "name": "OdooClaw AI Bot",
    "version": "16.0.1.1.0",
    "category": "Discuss",
    "summary": "Integrate OdooClaw AI agent via webhooks in Odoo Discuss",
    "description": """
OdooClaw AI Bot for Odoo Discuss.

Features:
- Bot user for Discuss channels and direct messages.
- Webhook bridge between Odoo and OdooClaw.
- Voice attachment support.
""",
    "author": "Nicolás Ramos",
    "license": "AGPL-3",
    "depends": ["mail"],
    "data": [
        "security/odooclaw_security.xml",
        "security/ir.model.access.csv",
        "data/odooclaw_bot_data.xml",
        "data/odooclaw_cron.xml",
    ],
    "installable": True,
    "application": False,
    "auto_install": False,
    "maintainer": "nicolasramos",
    "development_status": "Beta",
}
