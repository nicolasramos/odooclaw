# Skill: RLM Utilities (Recursive Language Models)

This skill provides essential tools for implementing the **Recursive Language Models (RLM)** reasoning strategy within OdooClaw. It allows the agent to handle large datasets by partitioning them into smaller, manageable chunks and aggregating results from sub-agents.

The strategy follows a **context-centric** decomposition philosophy: keep the root context small, recursively process subsets, and then consolidate.

## Capabilities

### 1. Data Partitioning (`rlm_partition`)
Splits a large list of Odoo records (from `search_read`) into multiple JSON files stored in the workspace.
- **Goal**: Avoid context window overflow and context rot.
- **Workflow**: `search_read` -> `rlm_partition` -> `spawn/subagent` for each chunk.

### 2. Result Aggregation (`rlm_aggregate`)
Combines results from multiple files or sub-agent outputs into a single report.
- **Goal**: Consolidate findings from the "Map" phase of recursion.
- **Workflow**: Collect results from sub-agents -> `rlm_aggregate` -> Final User Response.

## Usage Guide (RLM Strategy)

When faced with a query requiring deep analysis of many records (e.g., "Analyze the last 100 invoices for patterns"):

1.  **Decompose**: Use `odoo-manager` to fetch records, then immediately use `rlm_partition` if the list is large.
2.  **REPL Variable Store**: Treats `odooclaw/workspace/tmp/rlm/` as a variable store.
3.  **Recursive Processing**: Launch sub-agents to process each file path returned by `rlm_partition`.
4.  **Reduce**: Summarize the individual results using `rlm_aggregate` or a final reasoning step.

## RLM patterns used in OdooClaw

- **Peek/Grep first**: Before full recursion, narrow scope with targeted domains/filters in `odoo-manager`.
- **Partition + Map**: Split large result sets into chunks and process each chunk in isolated sub-agents.
- **Reduce**: Consolidate chunk-level outputs into one final user answer.
- **Context hygiene**: Keep long raw data in workspace files, not in the main chat context.

## Rules
- Always use absolute paths provided by the tools.
- Clean up temporary files if they are no longer needed (future).
- Prefer smaller chunks (e.g., 5-10 records) for maximum precision in sub-agents.
- Prefer deterministic chunk sizes for reproducibility (e.g., 10, 20, 50).
