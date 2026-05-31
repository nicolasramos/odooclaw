# Gateway TLS Support

OdooClaw supports two TLS deployment patterns for webhook and health endpoints.

## Recommended production path: reverse proxy termination

For Doodba and most production deployments, terminate TLS at the edge proxy and keep OdooClaw on plain HTTP inside the private Docker network.

```text
Internet
  ↓ HTTPS
Traefik / Nginx / Caddy
  ↓ HTTP private network
OdooClaw gateway :18790
  ↓ HTTP private network
Odoo / Doodba
```

Why this is preferred:

- certificate renewal stays in the proxy layer;
- OdooClaw keeps a small runtime surface;
- Doodba deployments commonly already use Traefik or another edge proxy;
- internal service-to-service calls remain simple and private.

Example Odoo system parameter when Odoo and OdooClaw share the Doodba network:

```text
odooclaw.webhook_url = http://odooclaw:18790/webhook/odoo
```

Expose OdooClaw publicly only through the reverse proxy if an external provider must call the webhook directly.

## Optional standalone path: native TLS

For standalone deployments without a reverse proxy, enable native TLS on the shared OdooClaw gateway.

### JSON config

```json
{
  "gateway": {
    "host": "0.0.0.0",
    "port": 18790,
    "tls": {
      "enabled": true,
      "cert_file": "/etc/odooclaw/tls.crt",
      "key_file": "/etc/odooclaw/tls.key"
    }
  }
}
```

### Environment variables

```env
ODOOCLAW_GATEWAY_TLS_ENABLED=true
ODOOCLAW_GATEWAY_TLS_CERT_FILE=/etc/odooclaw/tls.crt
ODOOCLAW_GATEWAY_TLS_KEY_FILE=/etc/odooclaw/tls.key
```

When native TLS is enabled, OdooClaw serves the same endpoints over HTTPS:

```text
https://<host>:18790/health
https://<host>:18790/ready
https://<host>:18790/webhook/odoo
```

## Operational notes

- `cert_file` and `key_file` are required when native TLS is enabled.
- Keep private keys mounted as read-only secrets or protected files.
- Do not enable both direct public exposure and a reverse proxy unless you intentionally need both paths.
- Prefer reverse proxy TLS for Doodba. Use native TLS for smaller standalone installations.
