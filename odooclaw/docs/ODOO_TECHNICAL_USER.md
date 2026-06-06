# Odoo Technical User for Delegated MCP Access

OdooClaw must not authenticate to Odoo with a general-purpose administrator.
Use a dedicated internal user whose only special permission is **OdooClaw
Delegated RPC**.

## Recommended User

Create an internal user such as `odooclaw_service` with:

- Internal User
- OdooClaw Delegated RPC
- no functional business groups
- no Administration / Settings access
- a strong password or Odoo API key stored outside Git

The technical user authenticates the MCP connection. Actual ORM operations
execute with the ACLs, record rules, and company access of the requesting Odoo
user.

## Doodba Configuration

Store credentials in an ignored file such as `.docker/odooclaw.env`:

```env
ODOO_USERNAME=odooclaw_service
ODOO_PASSWORD=replace-with-a-strong-password-or-api-key
```

Load it only into the OdooClaw service:

```yaml
services:
  odooclaw:
    env_file:
      - .docker/odooclaw.env
    environment:
      - ODOO_URL=http://odoo:8069
      - ODOO_DB=devel
```

Do not provide fallback administrator credentials in Compose files.

## Verification Checklist

1. Technical user cannot directly read `purchase.order`.
2. Delegation to a Purchase user can read `purchase.order`.
3. Delegation to a restricted user is rejected by Odoo ACLs.
4. An ordinary authenticated user cannot call the delegated RPC endpoint.
5. Inactive users and the Odoo superuser cannot be delegated targets.
