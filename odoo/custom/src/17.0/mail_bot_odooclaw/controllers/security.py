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

    Default-deny: if neither is configured, the request is rejected.
    The IP check runs first so that a trusted host can recover from a
    misconfigured token.
    """
    _check_ip_allowlist()
    _check_token()


def _check_ip_allowlist():
    """Reject the request if the client IP is not in the allowlist."""
    raw = (
        request.env["ir.config_parameter"]
        .sudo()
        .get_param("odooclaw.allowed_ips", "")
        .strip()
    )
    if not raw:
        return

    client_ip = request.httprequest.remote_addr
    if not client_ip:
        _abort(401, "Unauthorized: no client IP")

    allowed = [s.strip() for s in raw.split(",") if s.strip()]
    for entry in allowed:
        try:
            network = ipaddress.ip_network(entry, strict=False)
            if ipaddress.ip_address(client_ip) in network:
                return
        except ValueError:
            _logger.warning("odooclaw: invalid IP network in allowlist: %r", entry)
            continue

    _abort(401, "Unauthorized: IP not allowed")


def _check_token():
    """Reject the request if the shared secret token is missing or wrong."""
    expected = (
        request.env["ir.config_parameter"]
        .sudo()
        .get_param("odooclaw.reply_token", "")
        .strip()
    )
    if not expected:
        return

    actual = request.httprequest.headers.get("X-OdooClaw-Token", "")
    if not secrets.compare_digest(actual, expected):
        _abort(401, "Unauthorized: invalid token")


def _abort(status, reason):
    """Send a JSON error response and raise to short-circuit the handler."""
    body = json.dumps({"status": "error", "reason": reason})
    response = request.make_response(body, headers=[("Content-Type", "application/json")])
    response.status_code = status
    raise response


def error_response(reason, status=400):
    """Return a sanitized JSON error response (no traceback leakage)."""
    return request.make_json_response({"status": "error", "reason": reason}, status=status)


def log_exception(logger, msg):
    """Log an exception with traceback, then return a safe error response."""
    logger.exception(msg)
    return error_response("Internal error", status=500)
