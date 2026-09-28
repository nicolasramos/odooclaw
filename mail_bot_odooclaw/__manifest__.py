# © 2026 Nicolás Ramos — MIT License
{
    "name": "mail_bot_odooclaw",
    "summary": "runonweb AI integration for Odoo webclient",
    "version": "0.0.1",
    "category": "Discuss",
    "license": "Other OSI approved licence",
    "author": "Nicolás Ramos",
    "website": "https://github.com/nicolasramos/odooclaw",
    "depends": ["mail"],
    "data": [
        "security/ir.model.access.csv",
        "views/runonweb_settings_views.xml",
        "views/runonweb_feature_flag_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "mail_bot_odooclaw/static/src/js/runonweb_bundle.js",
        ],
    },
    "installable": True,
    "auto_install": False,
}
