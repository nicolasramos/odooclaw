# Release v0.2.2

## Summary

This release strengthens multi-database reliability for Odoo channel replies and improves project discoverability for production-ready Doodba deployments.

## Highlights

- Added deterministic Odoo reply DB routing through channel configuration:
  - New config key: `channels.odoo.target_db`
  - New env override: `ODOOCLAW_CHANNELS_ODOO_TARGET_DB`
- Updated Odoo channel endpoint builder to prioritize explicit target DB and fallback to `ODOO_DB`.
- Added unit tests for reply endpoint DB selection behavior.
- Updated base config example with `target_db` placeholder.
- Added repository cross-links to the official Doodba template:
  - `https://github.com/nicolasramos/odooclaw-doodba`

## Why this matters

In multi-DB Odoo environments, ambiguous DB resolution can cause reply failures (`404`) on `/odooclaw/reply`. This release makes reply routing explicit and deterministic.

## Validation

- `go test ./pkg/channels/odoo` (from `odooclaw/`) passed.

## Commits included

- Multi-DB routing + config/docs linkage commit(s) on top of `v0.2.1`.
