# Multi-Agent Routing

OdooClaw supports multiple specialized agents in a single instance.
Each agent has its own workspace, instructions (`AGENTS.md`), and optionally
a different LLM model. Incoming messages are automatically routed to the
right agent based on **bindings** declared in `config.json`.

## Defining Agents

Add an `agents.list` section to your `config.json`:

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.odooclaw/workspace",
      "model_name": "claude-sonnet-4-6"
    },
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.odooclaw/workspace"
      },
      {
        "id": "crm",
        "workspace": "~/.odooclaw/workspace-crm"
      },
      {
        "id": "finance",
        "workspace": "~/.odooclaw/workspace-finance",
        "model_name": "mistral-large"
      }
    ]
  }
}
```

Each agent workspace contains its own `AGENTS.md` with specialized instructions.

## Routing with Bindings

Bindings map incoming messages to agents based on channel, peer, or guild.
Add a `bindings` section at the root of `config.json`:

```json
{
  "bindings": [
    {
      "agent_id": "crm",
      "match": {
        "channel": "odoo",
        "account_id": "*",
        "peer": { "kind": "group", "id": "crm.lead_*" }
      }
    },
    {
      "agent_id": "finance",
      "match": {
        "channel": "odoo",
        "account_id": "*",
        "peer": { "kind": "group", "id": "account.move_*" }
      }
    }
  ]
}
```

### Peer ID Wildcard Matching (Odoo channel)

In the Odoo channel, peer IDs are dynamic: `{model}_{record_id}`
(e.g. `crm.lead_23824`, `project.task_19908`).

Use a `*` suffix to match all records of a given model:

| Pattern | Matches |
|---|---|
| `crm.lead_*` | All CRM leads and opportunities |
| `account.move_*` | All invoices and journal entries |
| `project.task_*` | All project tasks |
| `sale.order_*` | All sales orders |
| `stock.picking_*` | All delivery orders |
| `helpdesk.ticket_*` | All helpdesk tickets |
| `crm.lead_23824` | Exact match on a single record |

### Routing Priority

Messages are routed in the following priority order:

1. Peer binding (exact or prefix match)
2. Parent peer binding
3. Guild binding (Discord)
4. Team binding (Slack/Teams)
5. Account binding
6. Channel wildcard binding
7. Default agent (fallback)

### DM vs Group Chatter

- **Direct messages** in Discuss → `peer.kind = "direct"`, `peer.id = {user_id}`
- **Group channel** (@OdooClaw mention) → `peer.kind = "group"`, `peer.id = {channel_id}`
- **Record chatter** (@OdooClaw in a business object) → `peer.kind = "group"`, `peer.id = {model}_{res_id}`

## Sub-Agent Delegation (spawn)

Agents can delegate tasks to other agents using the `spawn` tool.
Control which agents can spawn others via `subagents.allow_agents`:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "subagents": {
          "allow_agents": ["crm", "finance"]
        }
      }
    ]
  }
}
```

The `main` agent can then write `@crm` or `@finance` in its reasoning
to spawn a sub-agent that handles the delegated task.
