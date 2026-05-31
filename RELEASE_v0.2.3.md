# Release v0.2.3

## Summary

This release adds deployment hardening for OdooClaw webhooks with optional native TLS support and documents the recommended Doodba production pattern using reverse proxy TLS termination.

It also starts the Website Edit Mode / Guided Training feasibility track with an initial roadmap document.

## Highlights

- Added optional native TLS support for the shared OdooClaw gateway:
  - New config block: `gateway.tls`
  - New env overrides:
    - `ODOOCLAW_GATEWAY_TLS_ENABLED`
    - `ODOOCLAW_GATEWAY_TLS_CERT_FILE`
    - `ODOOCLAW_GATEWAY_TLS_KEY_FILE`
- Kept reverse proxy TLS termination as the recommended Doodba production path.
- Added gateway TLS documentation with Doodba and standalone deployment guidance.
- Updated Browser Copilot Doodba setup docs to reference the TLS deployment guide.
- Added tests for gateway TLS config defaults, env parsing and TLS validation.
- Updated Anthropic provider tests to mock the streaming API introduced in the current main branch.
- Started the Website Edit Mode / Guided Training roadmap in `docs/website-edit-viability.md`.

## Why this matters

Webhook endpoints are part of the external integration surface. Doodba deployments should normally terminate TLS at Traefik, Nginx or Caddy, while standalone deployments need a safe native TLS option when no reverse proxy is available.

This release supports both deployment models without forcing one architecture onto every user.

## Validation

From `odooclaw/`:

- `go test ./pkg/config ./pkg/channels ./cmd/odooclaw/internal/gateway` passed.
- `go test ./...` passed.

From repository root:

- `python3 -m pytest odooclaw/browser_copilot/tests -q` passed (`29 passed`).

## Issues

- Addresses: https://github.com/nicolasramos/odooclaw/issues/9
- Starts: https://github.com/nicolasramos/odooclaw/issues/10
