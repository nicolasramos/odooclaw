import json
import logging
import secrets
import ipaddress

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


def authorize():
    """
    Authorize an incoming request to internal OdooClaw endpoints.

    Checks, in order:
    1. IP allowlist (from ir.config_parameter 'odooclaw.allowed_ips')
    2. Shared secret token (from ir.config_parameter 'odooclaw.reply_token',
       expected in the X-OdooClaw-Token header)

    Default-deny: at least one of the two must be configured AND pass.
    If neither is configured, the request is rejected.
    The IP check runs first so that a trusted host can recover from a
    misconfigured token.
    """
    ip_configured = _check_ip_allowlist()
    token_configured = _check_token()
    if not ip_configured and not token_configured:
        _abort(
            401,
            "Unauthorized: no security configuration. "
            "Set odooclaw.reply_token or odooclaw.allowed_ips",
        )


def _check_ip_allowlist():
    """
    Check the client IP against the allowlist.

    Returns True if the allowlist is configured (check was performed),
    False if no allowlist is configured (check was skipped).
    Raises _abort if the IP is not allowed.
    """
    raw = (
        request.env["ir.config_parameter"]
        .sudo()
        .get_param("odooclaw.allowed_ips", "")
        .strip()
    )
    if not raw:
        return False

    client_ip = request.httprequest.remote_addr
    if not client_ip:
        _abort(401, "Unauthorized: no client IP")

    allowed = [s.strip() for s in raw.split(",") if s.strip()]
    for entry in allowed:
        try:
            network = ipaddress.ip_network(entry, strict=False)
            if ipaddress.ip_address(client_ip) in network:
                return True
        except ValueError:
            _logger.warning("odooclaw: invalid IP network in allowlist: %r", entry)
            continue

    _abort(401, "Unauthorized: IP not allowed")


def _check_token():
    """
    Check the shared secret token from the X-OdooClaw-Token header.

    Returns True if a token is configured (check was performed),
    False if no token is configured (check was skipped).
    Raises _abort if the token is invalid.
    """
    expected = (
        request.env["ir.config_parameter"]
        .sudo()
        .get_param("odooclaw.reply_token", "")
        .strip()
    )
    if not expected:
        return False

    actual = request.httprequest.headers.get("X-OdooClaw-Token", "")
    if not secrets.compare_digest(actual, expected):
        _abort(401, "Unauthorized: invalid token")
    return True


from werkzeug.exceptions import HTTPException


def _abort(status, reason):
    """Send a JSON error response and raise to short-circuit the handler."""
    raise HTTPException(
        response=request.make_json_response(
            {"status": "error", "reason": reason}, status=status
        )
    )


def error_response(reason, status=400):
    """Return a sanitized JSON error response (no traceback leakage)."""
    return request.make_json_response({"status": "error", "reason": reason}, status=status)


def log_exception(logger, msg):
    """Log an exception with traceback, then return a safe error response."""
    logger.exception(msg)
    return error_response("Internal error", status=500)
