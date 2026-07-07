import json
from unittest.mock import MagicMock, patch

from odoo.tests import TransactionCase, tagged


@tagged("post_install", "-at_install")
class TestSecurityHelpers(TransactionCase):
    """Test the security helper functions in isolation."""

    def setUp(self):
        super().setUp()
        # Set up test config parameters
        self.env["ir.config_parameter"].sudo().set_param(
            "odooclaw.reply_token", "test-token-123"
        )
        self.env["ir.config_parameter"].sudo().set_param(
            "odooclaw.allowed_ips", "192.168.1.0/24,10.0.0.0/8"
        )

    def test_default_deny_no_config(self):
        """Without any config, authorize() should reject the request."""
        from ..controllers.security import authorize, _abort

        with patch("odoo.http.request") as mock_request:
            mock_request.env = self.env
            mock_request.env["ir.config_parameter"].sudo().get_param = (
                lambda key, default="": ""
            )
            mock_request.httprequest.remote_addr = "10.0.0.1"
            mock_request.httprequest.headers.get = lambda key, default="": ""
            with self.assertRaises(Exception) as ctx:
                authorize()
            self.assertIn("Unauthorized", str(ctx.exception))

    def test_ip_allowed_cidr(self):
        """Test that IPs within allowed CIDR ranges pass."""
        from ..controllers.security import _check_ip_allowlist

        with patch("odoo.http.request") as mock_request:
            mock_request.env = self.env
            mock_request.httprequest.remote_addr = "192.168.1.50"
            mock_request.env["ir.config_parameter"].sudo().get_param = (
                lambda key, default="": (
                    "192.168.1.0/24,10.0.0.0/8"
                    if key == "odooclaw.allowed_ips"
                    else default
                )
            )
            result = _check_ip_allowlist()
            self.assertTrue(result)

    def test_ip_not_allowed(self):
        """Test that IPs outside allowed ranges are rejected."""
        from ..controllers.security import _check_ip_allowlist

        with patch("odoo.http.request") as mock_request:
            mock_request.env = self.env
            mock_request.httprequest.remote_addr = "8.8.8.8"
            mock_request.env["ir.config_parameter"].sudo().get_param = (
                lambda key, default="": (
                    "192.168.1.0/24"
                    if key == "odooclaw.allowed_ips"
                    else default
                )
            )
            with self.assertRaises(Exception):
                _check_ip_allowlist()

    def test_token_valid(self):
        """Test that a valid token passes."""
        from ..controllers.security import _check_token

        with patch("odoo.http.request") as mock_request:
            mock_request.env = self.env
            mock_request.httprequest.headers.get = lambda key, default="": (
                "test-token-123" if key == "X-OdooClaw-Token" else default
            )
            mock_request.env["ir.config_parameter"].sudo().get_param = (
                lambda key, default="": (
                    "test-token-123"
                    if key == "odooclaw.reply_token"
                    else default
                )
            )
            result = _check_token()
            self.assertTrue(result)

    def test_token_invalid(self):
        """Test that an invalid token is rejected."""
        from ..controllers.security import _check_token

        with patch("odoo.http.request") as mock_request:
            mock_request.env = self.env
            mock_request.httprequest.headers.get = lambda key, default="": (
                "wrong-token" if key == "X-OdooClaw-Token" else default
            )
            mock_request.env["ir.config_parameter"].sudo().get_param = (
                lambda key, default="": (
                    "test-token-123"
                    if key == "odooclaw.reply_token"
                    else default
                )
            )
            with self.assertRaises(Exception):
                _check_token()

    def test_error_response_sanitized(self):
        """Test that error responses don't leak internals."""
        from ..controllers.security import error_response

        result = error_response("Something went wrong", status=500)
        data = json.loads(result.data)
        self.assertEqual(data["status"], "error")
        self.assertEqual(data["reason"], "Something went wrong")
        self.assertEqual(result.status_code, 500)

    def test_error_response_default_status(self):
        """Test default status code is 400."""
        from ..controllers.security import error_response

        result = error_response("Bad request")
        self.assertEqual(result.status_code, 400)

    def test_authorize_passes_with_token_only(self):
        """authorize() should pass when only token is configured and valid."""
        from ..controllers.security import authorize

        with patch("odoo.http.request") as mock_request:
            mock_request.env = self.env
            mock_request.httprequest.remote_addr = "10.0.0.1"
            mock_request.httprequest.headers.get = lambda key, default="": (
                "test-token-123" if key == "X-OdooClaw-Token" else default
            )
            mock_request.env["ir.config_parameter"].sudo().get_param = (
                lambda key, default="": (
                    "test-token-123"
                    if key == "odooclaw.reply_token"
                    else ""
                )
            )
            # Should not raise
            authorize()

    def test_authorize_passes_with_ip_only(self):
        """authorize() should pass when only IP allowlist is configured and IP matches."""
        from ..controllers.security import authorize

        with patch("odoo.http.request") as mock_request:
            mock_request.env = self.env
            mock_request.httprequest.remote_addr = "192.168.1.50"
            mock_request.httprequest.headers.get = lambda key, default="": ""
            mock_request.env["ir.config_parameter"].sudo().get_param = (
                lambda key, default="": (
                    "192.168.1.0/24"
                    if key == "odooclaw.allowed_ips"
                    else ""
                )
            )
            # Should not raise
            authorize()
