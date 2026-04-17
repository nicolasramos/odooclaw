# OdooClaw Browser Copilot Backend (Phase 1 MVP)

`browser_copilot` is a standalone FastAPI module for receiving tab snapshots from a Chromium extension, analyzing context (including Odoo heuristics), and returning structured suggestions/actions.

## Folder Structure

```text
odooclaw/browser_copilot/
├── __init__.py
├── app.py
├── schemas.py
├── service.py
├── router.py
├── security.py
├── detector_odoo.py
├── action_executor.py
├── prompts.py
├── requirements.txt
├── README.md
└── tests/
```

## API Endpoints

- `POST /browser-copilot/snapshot`
  - Validates snapshot payload (Pydantic)
  - Enforces token + domain allowlist
  - Stores latest snapshot in memory
  - Runs Odoo detection and returns structured analysis
- `POST /browser-copilot/plan`
  - Receives `{ snapshot, instruction }`
  - Returns `{ intent, reasoning_summary, actions_suggested, confidence }`
  - In `read_only=true`, no executable actions are returned
- `POST /browser-copilot/action`
  - Receives approved action
  - Validates allowlisted action type and target
  - Returns strict JSON command for extension execution
  - Blocked when `read_only=true`
- `POST /browser-copilot/pairing/create`
  - Creates a short-lived pairing code for a specific conversation
- `POST /browser-copilot/pairing/link`
  - Resolves a user-provided pairing code from the extension
- `POST /browser-copilot/context/resolve`
  - Returns the latest browser context linked to a conversation
- `GET /browser-copilot/health`

## Security Model

- Domain allowlist via `BROWSER_COPILOT_ALLOWED_DOMAINS`
- Shared local token via `BROWSER_COPILOT_TOKEN`
- `read_only=true` by default (`BROWSER_COPILOT_READ_ONLY`)
- Allowed action types only:
  - `click`
  - `set_value`
  - `select_option`
  - `scroll_into_view`
- No arbitrary JavaScript execution

## Odoo Detection Heuristics

The detector infers Odoo context from:

- `/web` path and URL hash values (`model`, `id`)
- Common Odoo CSS signatures (`o_form`, `o_list`, `o_kanban`)
- Breadcrumbs/headings/visible text hints
- Form/list/kanban/calendar clues from selectors and content
- Chatter visibility hint

Known model hints include:

- `res.partner`
- `sale.order`
- `account.move`
- `project.task`
- `crm.lead`

## Run Locally

From repo root:

```bash
python3 -m venv .venv-browser-copilot
source .venv-browser-copilot/bin/activate
pip install -r "odooclaw/browser_copilot/requirements.txt"
export BROWSER_COPILOT_ALLOWED_DOMAINS="*.odoo.com,localhost,127.0.0.1"
export BROWSER_COPILOT_TOKEN="dev-token"
export BROWSER_COPILOT_READ_ONLY="true"
uvicorn browser_copilot.app:app --host 127.0.0.1 --port 8765 --app-dir "odooclaw"
```

## Example Snapshot Payload

```json
{
  "page": {
    "url": "https://demo.odoo.com/web#id=42&model=res.partner&view_type=form",
    "title": "Azure Interior - Odoo",
    "domain": "demo.odoo.com",
    "timestamp": "2026-03-19T12:30:00Z"
  },
  "app": {
    "detected": "unknown",
    "model": null,
    "record_id": null,
    "view_type": null
  },
  "visible_text": "Azure Interior Contact data...",
  "elements": [
    {
      "id": "el_001",
      "type": "input",
      "label": "Name",
      "name": "name",
      "role": "textbox",
      "selector": "input[name='name']",
      "value": "",
      "visible": true,
      "enabled": true
    }
  ],
  "forms": [],
  "tables": [],
  "headings": ["Azure Interior"],
  "breadcrumbs": ["Sales / Customers"],
  "actions_available": ["click", "set_value", "select_option"]
}
```

## Example Plan Response

```json
{
  "intent": "summarize_record",
  "reasoning_summary": "Intent 'summarize_record' inferred from user instruction and page context with 34 interactive elements on demo.odoo.com.",
  "actions_suggested": [],
  "confidence": 0.93
}
```

## Example Action Command Response

```json
{
  "status": "ok",
  "command": {
    "action_type": "set_value",
    "target": {
      "element_id": "el_004",
      "selector": "input[name='name']"
    },
    "value": "Cliente de prueba",
    "reason": "First empty editable field found in current form."
  },
  "message": "Action approved and serialized for extension execution."
}
```

## Tests

```bash
source .venv-browser-copilot/bin/activate
pytest "odooclaw/browser_copilot/tests" -q
```

Covered in Phase 1:

- Snapshot schema validation
- Odoo context detection
- Plan generation behavior
- Domain/token security checks
- Action serialization and safety checks

## Docker Compose Quick Start

Run only Browser Copilot in a minimal container:

```bash
docker compose -f "odooclaw/browser_copilot/docker-compose.browser-copilot.yml" up --build
```

Optional runtime overrides:

```bash
BROWSER_COPILOT_ALLOWED_DOMAINS="*.odoo.com,localhost,127.0.0.1" \
BROWSER_COPILOT_TOKEN="dev-token" \
BROWSER_COPILOT_READ_ONLY="true" \
docker compose -f "odooclaw/browser_copilot/docker-compose.browser-copilot.yml" up --build
```

Stop service:

```bash
docker compose -f "odooclaw/browser_copilot/docker-compose.browser-copilot.yml" down
```

## Smoke Test Script

Once backend is running locally on `127.0.0.1:8765`:

```bash
./odooclaw/browser_copilot/scripts/smoke_test.sh
```

Custom host/token:

```bash
BASE_URL="http://127.0.0.1:8765" BROWSER_COPILOT_TOKEN="dev-token" \
./odooclaw/browser_copilot/scripts/smoke_test.sh
```

What it checks:

1. `GET /browser-copilot/health`
2. `POST /browser-copilot/snapshot`
3. `POST /browser-copilot/plan`
4. `POST /browser-copilot/action` (expects `403` if `read_only=true`)

## Current Conversation Pairing Flow

The Browser Copilot MVP now supports a conversation-linked flow:

1. OdooClaw chat generates a short pairing code.
2. The user pastes that code into the extension popup.
3. The extension links the active tab to that Odoo conversation.
4. Browser Copilot stores snapshots by conversation, not only by domain.
5. OdooClaw can resolve the latest shared browser context for that same chat.

## SQLite Memory and Browser Context

Browser Copilot is separate from the SQLite memory backend.

- Browser Copilot stores recent page context in memory for fast per-conversation resolution.
- OdooClaw memory uses `workspace/memory/main.sqlite` for long-term recall and prompt-safe retrieval.

See `odooclaw/docs/SQLITE_MEMORY.md` for the memory backend details.

## Phase 2 Backlog (Prepared, not implemented)

1. Optional screenshot channel for hard visual cases
2. WebSocket mode for low-latency streaming updates
3. Multi-action plans and guarded execution chains
4. Pattern learning for repetitive workflows
5. Site profiles (per-domain settings and policies)
6. OdooClaw skill-level integration hooks
7. Better support for editable grids and advanced widgets
