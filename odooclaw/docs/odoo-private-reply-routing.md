# Odoo Private Reply Routing

This guide explains how OdooClaw handles reply privacy in Odoo Discuss and how to configure DM-only versus group-triggered behavior.

## Goal

Ensure responses are delivered to the correct user context and avoid cross-user leakage in shared channels.

## Modes

### 1) DM-only mode (recommended default)

Set:

```yaml
ODOOCLAW_CHANNELS_ODOO_ALLOW_GROUP_MENTIONS=false
```

Behavior:

- Direct messages are processed.
- Group mentions are ignored with a non-error webhook response:
  - `{"status":"ignored","reason":"group_mentions_disabled"}`

### 2) Group mentions enabled (advanced)

Set:

```yaml
ODOOCLAW_CHANNELS_ODOO_ALLOW_GROUP_MENTIONS=true
```

Behavior:

- Group mentions are accepted.
- Odoo module provides `reply_model` + `reply_res_id` when available.
- Gateway routes replies to private user↔bot chat targets.
- Session scope for these interactions is user-isolated (`peer.Kind=direct`, `peer.ID=sender_id`).

## Why this matters

- Protects privacy when users mention the bot in shared channels.
- Prevents accidental context sharing between participants in a group thread.
- Preserves predictable 1:1 assistant behavior for operational actions.

## Related updates

- Sender context injection now supports `odoo-mcp` alias in addition to `odoo-manager`.
- Workforce model access allowlist includes:
  - `hr.employee`
  - `hr.attendance`
  - `account.analytic.line`
  - `hr.expense`
  - `hr.expense.sheet`

## Quick validation checklist

1. **DM check-in:** “registra mi entrada” should use attendance flow without access-denied errors.
2. **Group mention (DM-only mode):** no assistant response in group.
3. **Group mention (enabled mode):** reply appears in private chat target, not the source group thread.
4. **Two users in same channel:** no cross-user context leakage.
