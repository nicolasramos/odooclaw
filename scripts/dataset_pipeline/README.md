# odooclaw Dataset Pipeline

Reproducible generation of training datasets from MCP tool metadata.

## Pipeline

```
Repository → Parser → Tool Metadata → Generator → Dataset JSONL → Training
```

No hand-written datasets. Fully reproducible: change an MCP tool → regenerate the dataset automatically.

## Components

| File | Purpose |
|------|---------|
| `parser.py` | Extracts tool metadata from MCP server sources (134 tools across 5 servers) |
| `generator.py` | Produces LFM-format training examples (JSONL) from metadata |
| `validator.py` | Validates dataset quality: format, coverage, balance |
| `orchestrator.py` | Runs the full pipeline end-to-end |
| `soup.yaml` | Soup training framework integration config |

## Usage

### Quick start

```bash
# Run the full pipeline
python scripts/dataset_pipeline/orchestrator.py /path/to/odooclaw --seed 42

# Output goes to: scripts/dataset_pipeline/output/
#   - metadata.json        (parsed tool metadata)
#   - dataset.jsonl        (training examples)
#   - validation_report.json (quality report from validator)
#   - manifest.json        (pipeline metadata)
```

### Individual stages

```bash
# 1. Parse tools from MCP sources
python scripts/dataset_pipeline/parser.py /path/to/odooclaw --output metadata.json

# 2. Generate dataset from metadata
python scripts/dataset_pipeline/generator.py metadata.json --output dataset.jsonl --seed 42

# 3. Validate the dataset
python scripts/dataset_pipeline/validator.py dataset.jsonl metadata.json

# 4. Check the validation report
cat scripts/dataset_pipeline/output/validation_report.json
```

### Soup integration

```bash
# Train with Soup
soup train --dataset scripts/dataset_pipeline/output/dataset.jsonl \
  --config scripts/dataset_pipeline/soup.yaml
```

## Tool Coverage

The parser handles all 134 MCP tools across 5 servers:

| Server | Tools | Source Pattern |
|--------|-------|----------------|
| odoo-mcp | 124 | `@mcp.tool()` decorators in server.py |
| rlm-utils | 2 | `build_tools()` returning JSON schema dicts |
| ocr-invoice | 2 | `build_tools()` returning JSON schema dicts |
| edge-tts | 2 | `build_tools()` returning JSON schema dicts |
| whisper-stt | 2 | `build_tools()` returning JSON schema dicts |

## Example Categories

- **tool_selection**: Which tool to call for a user intent
- **argument_filling**: Correct argument values for a tool call
- **error_handling**: Recovering from tool errors
- **multi_turn**: Multi-turn conversations with tool calls

## LFM Native Format

Examples use the native Pythonic format:
```
<|tool_call_start|>mcp_odoo-mcp_odoo_search(model="res.partner", domain=[["customer_rank", ">", 0]])<|tool_call_end|>
```

## Reproducibility

The pipeline is deterministic: same commit of MCP tools + same seed → identical dataset (same hash).

Verify: `sha256sum scripts/dataset_pipeline/output/dataset.jsonl`

## Acceptance Criteria

- [x] Parser extracts metadata from all 134 real MCP tools
- [x] Generator produces JSONL training examples without manual intervention
- [x] Tool changes trigger dataset regeneration (reproducible, no manual editing)
- [x] Integrated with Soup workflow (dataset → train → gate → publish)
- [x] Documented for agents (this README + soup.yaml)
