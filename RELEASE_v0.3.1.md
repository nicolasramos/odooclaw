# OdooClaw v0.3.1

## Summary

This release integrates selected stability and performance optimizations from the PicoClaw upstream project, hardening the LLM retry loop, context compression, session indexing, and MCP reconnection logic.

## Highlights

- Context budgeting and safe compression:
  - Structured token estimation with conservative CJK/emoji handling.
  - Turn-based compression that never retries an identical request on no-op.
  - Removed redundant system-note injection during compression.
- Pico O(1) session indexing:
  - Global and per-session connection indices replace linear scans.
  - Atomic Start/Stop lifecycle with snapshot-before-IO.
  - Race fixes for registration-after-stop, cancellation, and lifecycle context.
- MCP reconnect and retry:
  - Exactly-once retry on `ErrSessionMissing` with concurrent deduplication.
  - Safe Close/WaitGroup admission prevents goroutine leaks.
  - go-sdk pinned to v1.4.1 for the `ErrSessionMissing` sentinel.
- Unified transient LLM retries:
  - `transientLLMRetryReason()` uses `providers.ClassifyError()` first, string-pattern fallback second.
  - Covers server errors (5xx), timeouts, rate limits (429), and network failures.

## Safety model

- No changes to the Odoo ACL, record-rule, or delegated-user enforcement introduced in v0.3.0.
- MCP retry is limited to `ErrSessionMissing` only — no textual error matching that could mask real failures.
- LLM transient retries are classified by error type; non-transient errors fail immediately.

## Validation

- `pkg/agent`: focused tests pass with `-race -count=1`.
- `pkg/channels/pico`: index and lifecycle tests pass with `-race -count=1`.
- `pkg/mcp`: reconnect, dedup, and Close-safety tests pass with `-race -count=1`.
- `go vet ./...` clean.
- `go mod tidy` produces no diff.
- No build was performed during release preparation.

## Issues

- Pull request: https://github.com/nicolasramos/odooclaw/pull/15
- Continues roadmap planning in:
  - https://github.com/nicolasramos/odooclaw/issues/10
  - https://github.com/nicolasramos/odooclaw/issues/11
  - https://github.com/nicolasramos/odooclaw/issues/13
  - https://github.com/nicolasramos/odooclaw/issues/14
