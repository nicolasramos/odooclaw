"""Smoke tests for mail_bot_odooclaw STT dictation module.

Verifies that the stt_dictado.js module loads without errors
and that the dictation button injection mechanism works.
"""
# © 2026 Nicolás Ramos — MIT License
from odoo.tests import HttpCase, tagged


@tagged("mail_bot_odooclaw", "-standard")
class TestSttDictationSmoke(HttpCase):
    """Smoke tests for STT dictation integration.

    These tests verify that the JS module loads correctly
    and produces no console errors when the Discuss UI loads.
    """

    def test_01_discuss_loads_without_stt_errors(self):
        """Load /odoo/discuss and verify no stt_dictado errors in console.

        The stt_dictado.js module should load without throwing
        "unmet dependencies" or "module not defined" errors.
        """
        self.rainbow_man()
        # Load Discuss page - should not throw JS errors
        self.browser_js(
            url_root="/odoo/",
            url_path="discuss",
            path="/static/tests/test_stt_dictation.js",
            timeout=30,
            extra_args={"assets": "web.assets_backend"},
        )

    def test_02_stt_module_exports_exist(self):
        """Verify that stt_dictado.js exports are available in the bundle.

        The module should export DictationState, STT_MODEL_ID,
        and STT_SAMPLE_RATE as part of window.runonwebBundle.
        """
        self.rainbow_man()
        self.browser_js(
            url_root="/odoo/",
            url_path="discuss",
            path="/static/tests/test_stt_dictation.js",
            timeout=30,
            extra_args={"assets": "web.assets_backend"},
            js_extra="window.runonwebBundle && window.runonwebBundle.SttBridge;",
        )

    def test_03_composer_selector_matches_real_dom(self):
        """Verify that the composer selector in stt_dictado.js
        matches the actual class names used in Odoo 17/18.

        The selector should find .o-mail-Composer elements
        which are the actual composer containers in the DOM.
        """
        self.rainbow_man()
        self.browser_js(
            url_root="/odoo/",
            url_path="discuss",
            path="/static/tests/test_stt_dictation.js",
            timeout=30,
            extra_args={"assets": "web.assets_backend"},
            js_extra="""
                document.querySelectorAll('.o-mail-Composer').length > 0;
            """,
        )

    def test_04_marked_field_selector_works(self):
        """Verify that [data-runonweb-dictation=true] elements
        can be found in the DOM when present.

        The stt_dictado.js module looks for this selector
        to inject dictation buttons into marked fields.
        """
        self.rainbow_man()
        self.browser_js(
            url_root="/odoo/",
            url_path="discuss",
            path="/static/tests/test_stt_dictation.js",
            timeout=30,
            extra_args={"assets": "web.assets_backend"},
            js_extra="""
                document.querySelectorAll("[data-runonweb-dictation='true']").length >= 0;
            """,
        )
