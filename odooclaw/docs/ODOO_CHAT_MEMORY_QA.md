# Odoo Chat Memory QA Guide

This guide validates memory behavior directly from Odoo Discuss after enabling the historical memory layer.

## Scope

Validate that OdooClaw:

- preserves HOT memory behavior,
- adds scoped COLD/historical memory,
- avoids cross-record and cross-company leakage,
- supports temporal facts and timeline retrieval,
- keeps Odoo as source of truth on conflicts.

## Preconditions

1. OdooClaw deployed and reachable from Odoo webhook.
2. Odoo bot active in Discuss.
3. At least two partner records available (A and B).
4. Optional but recommended: test with two different `company_id` contexts.

## Recommended smoke sequence (from Odoo chat)

Use chat with record **A** first, then record **B**.

### 1) Persistent preference recall

Prompt 1:
`From now on I prefer follow-up summaries on Fridays in a short format.`

Prompt 2:
`Which day and format do I prefer for follow-up summaries?`

Expected:

- Recalls Friday + short format.
- Response is scoped to record A.

### 2) Transient/noise should not dominate memory

Prompt:
`Hello, thanks, ok.`

Then:
`What important information did I just leave for you to remember?`

Expected:

- Trivial messages should not be treated as a strong persistent memory signal.

### 3) Scope isolation across records

In record A:
`Remember that this customer prefers contact by email.`

In record B:
`Does this customer prefer contact by email?`

Expected:

- No leakage from A into B.

### 4) Scope isolation across companies

In company 1:
`Remember that this customer uses monthly consolidated billing.`

In company 2:
`What billing type does this customer use?`

Expected:

- No cross-company leakage.

### 5) Temporal fact validity

Prompt:
`From April 1st to April 30th, support hours are 08:00 to 14:00.`

Then ask:

- `What were the support hours on April 15th?`
- `What are the support hours today?`

Expected:

- In-range date answer reflects the fact.
- Out-of-range/current date does not incorrectly apply expired validity.

### 6) Explainability check

After a memory-based answer, ask:
`Explain where that information came from (recent memory, historical memory, or current context).`

Expected:

- Provides traceable explanation of where recall came from.

### 7) Odoo source-of-truth on conflicts

Prompt:
`Remember that invoice X is paid.`

Then:
`Confirm the real status of invoice X in Odoo.`

Expected:

- Odoo live data has priority if memory conflicts with system state.

## Acceptance checklist

- [ ] HOT memory remains operational.
- [ ] Historical memory improves scoped recall.
- [ ] No cross-record leakage.
- [ ] No cross-company leakage.
- [ ] Temporal validity behaves correctly.
- [ ] Explainability is available.
- [ ] Odoo remains authoritative on conflicts.

## Related docs

- [SQLite Memory Backend](SQLITE_MEMORY.md)
- [Main Documentation](README.md)
