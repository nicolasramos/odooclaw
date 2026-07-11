# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 18.0 | ✅ |
| 17.0 | ✅ |
| 16.0 | ✅ |

## Reporting a Vulnerability

This module is part of the OdooClaw project. To report a security
vulnerability:

1. **Do NOT** open a public GitHub issue.
2. Send a private report to the maintainer at contacto@nicolasramos.es.
3. Include a description of the vulnerability, steps to reproduce, and
   the affected version(s).

You should receive a response within 48 hours. If the vulnerability is
accepted, a fix will be prepared and released as a patch version bump.

## Hardening Checklist for Operators

- [ ] Configure `odooclaw.reply_token` in System Parameters (generate with
      `openssl rand -hex 32`)
- [ ] Configure `odooclaw.allowed_ips` to restrict access to the OdooClaw
      container's IP range
- [ ] Ensure Odoo's HTTP port (8069) is not exposed to the public internet
- [ ] Use Docker internal networking so the OdooClaw container reaches Odoo
      via an internal network
- [ ] Rotate the reply token periodically
- [ ] Monitor Odoo server logs for 401 responses to `/odooclaw/*` endpoints
- [ ] Review the `group_odooclaw_delegator` group membership regularly
      (members have admin-equivalent ORM access)
