#!/usr/bin/env python3
"""
Dataset Generator for odooclaw MCP tools.

Takes parsed tool metadata (from parser.py) and generates LFM-format
training examples in JSONL. Supports multiple example categories:

  - tool_selection:   Which tool to call for a user intent
  - argument_filling: Correct argument values for a tool call
  - error_handling:   Recovering from tool errors
  - multi_turn:       Multi-turn conversations with tool calls

Uses the LFM native format:
  <|tool_call_start|>mcp_odoo-mcp_odoo_search(model="res.partner", domain=[["customer_rank", ">", 0]])<|tool_call_end|>

Usage:
    python generator.py <metadata.json> --output dataset.jsonl [--seed 42]
"""

import hashlib
import json
import os
import random
import sys
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Entity pools for realistic query generation
# ---------------------------------------------------------------------------

PARTNER_NAMES = [
    "Acme SL", "TechCorp SA", "GlobalTrade Inc", "Iberia Logistics",
    "Mediterranean Foods", "Nordic Solutions", "Pacific Imports",
    "Alpine Manufacturing", "Coastal Trading", "Summit Consulting",
    "Delta Services", "Phoenix Industries", "Atlas Partners",
    "Meridian Group", "Horizon Enterprises", "Vertex Systems",
    "Orion Technologies", "Nexus Digital", "Pinnacle Corp",
    "Zenith Holdings",
]

PRODUCT_NAMES = [
    "Office Chair Pro", "Standing Desk Elite", "Monitor Arm Dual",
    "Keyboard Mechanical", "Mouse Wireless", "Webcam HD Pro",
    "USB Hub 7-Port", "Cable Management Kit", "Desk Lamp LED",
    "Filing Cabinet 4-Drawer",
]

PROJECT_NAMES = [
    "Website Redesign", "ERP Migration", "Inventory Audit",
    "Sales Process Optimization", "HR Onboarding Automation",
    "Accounting Year-End", "CRM Implementation", "Warehouse Setup",
]

CURRENCIES = ["EUR", "USD", "GBP", "MXN", "AR"]

STATES = ["draft", "sent", "confirmed", "done", "cancel"]


def _pick(lst):
    """Pick a random item from a list."""
    return lst[random.randint(0, len(lst) - 1)]


def _pick_n(lst, n):
    """Pick n unique items from a list."""
    return random.sample(lst, min(n, len(lst)))


# ---------------------------------------------------------------------------
# Tool name → category mapping (from metadata)
# ---------------------------------------------------------------------------

def _get_category(tool):
    """Get the category for a tool."""
    return tool.get("category", "general")


def _get_server(tool):
    """Get the server for a tool."""
    return tool.get("server", "odoo-mcp")


# ---------------------------------------------------------------------------
# Tool selection examples
# ---------------------------------------------------------------------------

def gen_tool_selection(tool: dict) -> list[dict]:
    """Generate tool_selection examples for a single tool."""
    name = tool["name"]
    server = _get_server(tool)
    category = _get_category(tool)
    params = tool["params"]

    examples = []

    if server == "odoo-mcp":
        examples.extend(_gen_odoo_selection(name, params, category))
    else:
        examples.extend(_gen_json_selection(name, params))

    return examples


def _gen_odoo_selection(name: str, params: list, category: str) -> list[dict]:
    """Generate tool_selection examples for odoo-mcp tools."""
    examples = []

    # Search/read tools
    if category == "records" and any(kw in name for kw in ["search", "read", "find"]):
        if any(p["name"] == "model" for p in params):
            # Partner search
            for partner in _pick_n(PARTNER_NAMES, 3):
                examples.append({
                    "user": f"Busca al cliente {partner}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(model=\"res.partner\", domain=[[\"customer_rank\", \">\", 0]])<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })
            for partner in _pick_n(PARTNER_NAMES, 2):
                examples.append({
                    "user": f"Find partner {partner}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(model=\"res.partner\", domain=[[\"customer_rank\", \">\", 0]])<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })

        # Task/project search
        if any(kw in name for kw in ["task"]):
            for proj in _pick_n(PROJECT_NAMES, 3):
                examples.append({
                    "user": f"Busca tareas de {proj}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(name=\"{proj}\")<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })

        # Sale order search
        if any(kw in name for kw in ["sale", "order"]):
            for partner in _pick_n(PARTNER_NAMES, 2):
                examples.append({
                    "user": f"Encuentra pedidos de {partner}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(partner_id=None)<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })

        # Product search
        if any(kw in name for kw in ["product", "stock"]):
            for product in _pick_n(PRODUCT_NAMES, 2):
                examples.append({
                    "user": f"Busca el producto {product}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(model=\"product.product\")<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })

        # Inventory/stock tools
        if any(kw in name for kw in ["inventory", "stock", "location", "transfer", "receipt", "delivery"]):
            examples.append({
                "user": "Revisa el inventario actual",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}()<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })

        # Purchase order search
        if any(kw in name for kw in ["purchase"]):
            examples.append({
                "user": "Busca órdenes de compra pendientes",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}()<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })

        # General record search
        if not any(kw in name for kw in ["partner", "task", "sale", "product", "inventory", "stock", "purchase"]):
            examples.append({
                "user": "Busca registros en el sistema",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(model=\"sale.order\")<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })

    # Partner tools
    elif category == "partners":
        if name == "odoo_find_partner":
            for partner in _pick_n(PARTNER_NAMES, 4):
                examples.append({
                    "user": f"Busca al cliente {partner}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(name=\"{partner}\")<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })
            for partner in _pick_n(PARTNER_NAMES, 2):
                examples.append({
                    "user": f"Find partner {partner}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(name=\"{partner}\")<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })
        elif name == "odoo_get_partner_summary":
            examples.append({
                "user": "Muestra el resumen del partner 42",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(partner_id=42)<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })

    # Task/project tools
    elif category == "projects":
        if name == "odoo_find_task":
            for proj in _pick_n(PROJECT_NAMES, 3):
                examples.append({
                    "user": f"Busca tareas del proyecto {proj}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(name=\"{proj}\")<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })
        elif name == "odoo_create_task":
            for proj in _pick_n(PROJECT_NAMES, 3):
                examples.append({
                    "user": f"Crea una tarea para {proj}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(name=\"Implementar {proj}\", project_id=1)<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })
        elif name == "odoo_find_my_tasks":
            examples.append({
                "user": "Muestra mis tareas pendientes",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}()<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })

    # Sales/order tools
    elif category == "sales":
        if name == "odoo_find_sale_order":
            for partner in _pick_n(PARTNER_NAMES, 3):
                examples.append({
                    "user": f"Encuentra pedidos de {partner}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}()<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })
        elif name == "odoo_create_sale_order":
            for partner in _pick_n(PARTNER_NAMES, 2):
                examples.append({
                    "user": f"Crea una orden de venta para {partner}",
                    "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(partner_id=42)<|tool_call_end|>",
                    "category": "tool_selection",
                    "tool_name": name,
                })
        elif name == "odoo_confirm_sale_order":
            examples.append({
                "user": "Confirma la orden de venta 42",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(order_id=42)<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })

    # Accounting tools
    elif category == "accounting":
        if name == "odoo_get_tax_summary":
            examples.append({
                "user": "Muestra el resumen de impuestos",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}()<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })
        elif name == "odoo_reconcile_bank_line":
            examples.append({
                "user": "Reconcilia la línea bancaria 100",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(line_id=100)<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })

    # Chatter tools
    elif category == "chatter":
        if name == "odoo_post_chatter_message":
            examples.append({
                "user": "Envía un mensaje al chatter del pedido",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(model=\"sale.order\", res_id=42, body=\"Nota interna\")<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })
        elif name == "odoo_create_activity":
            examples.append({
                "user": "Crea una actividad para el proyecto",
                "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(model=\"project.task\", res_id=42, summary=\"Seguimiento\")<|tool_call_end|>",
                "category": "tool_selection",
                "tool_name": name,
            })

    # Generic tools (catch-all)
    else:
        examples.append({
            "user": f"Usa la herramienta {name}",
            "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}()<|tool_call_end|>",
            "category": "tool_selection",
            "tool_name": name,
        })

    return examples


def _gen_json_selection(name: str, params: list) -> list[dict]:
    """Generate selection examples for JSON-schema tools."""
    examples = []

    if name == "rlm_partition":
        examples.append({
            "user": "Particiona esta lista de registros",
            "assistant": f"<|tool_call_start|>mcp_rlm-utils_rlm_partition(data=[...])<|tool_call_end|>",
            "category": "tool_selection",
            "tool_name": name,
        })
    elif name == "rlm_aggregate":
        examples.append({
            "user": "Agrrega los resultados de los chunks",
            "assistant": f"<|tool_call_start|>mcp_rlm-utils_rlm_aggregate(file_paths=[\"/tmp/chunk_1.json\"])<|tool_call_end|>",
            "category": "tool_selection",
            "tool_name": name,
        })
    elif name == "edge-tts-synthesize":
        examples.append({
            "user": "Convierte este texto a voz",
            "assistant": f"<|tool_call_start|>mcp_edge-tts_edge-tts-synthesize(text=\"Hola, bienvenido\")<|tool_call_end|>",
            "category": "tool_selection",
            "tool_name": name,
        })
    elif name == "edge-tts-list-voices":
        examples.append({
            "user": "¿Qué voces están disponibles?",
            "assistant": f"<|tool_call_start|>mcp_edge-tts_edge-tts-list-voices()<|tool_call_end|>",
            "category": "tool_selection",
            "tool_name": name,
        })
    elif name == "whisper-transcribe":
        examples.append({
            "user": "Transcribe el mensaje de voz adjunto",
            "assistant": f"<|tool_call_start|>mcp_whisper-stt_whisper-transcribe(attachment_id=100)<|tool_call_end|>",
            "category": "tool_selection",
            "tool_name": name,
        })
    elif name == "whisper-list-methods":
        examples.append({
            "user": "¿Qué métodos de transcripción están disponibles?",
            "assistant": f"<|tool_call_start|>mcp_whisper-stt_whisper-list-methods()<|tool_call_end|>",
            "category": "tool_selection",
            "tool_name": name,
        })

    return examples


# ---------------------------------------------------------------------------
# Argument filling generator
# ---------------------------------------------------------------------------

def gen_argument_filling(tool: dict) -> list[dict]:
    """Generate argument_filling examples for a tool."""
    name = tool["name"]
    params = tool["params"]
    examples = []

    if not params:
        # No-arg tools
        examples.append({
            "user": f"¿Qué hace {name}?",
            "assistant": f"<|tool_call_start|>mcp_{_get_server(tool)}_{name}()<|tool_call_end|>",
            "category": "argument_filling",
            "tool_name": name,
        })
        return examples

    if _get_server(tool) == "odoo-mcp":
        examples.extend(_gen_odoo_args(name, params))
    else:
        examples.extend(_gen_json_args(name, params))

    return examples


def _gen_odoo_args(name: str, params: list) -> list[dict]:
    """Generate argument filling examples for odoo-mcp tools."""
    examples = []

    args_parts = []
    for p in params:
        pname = p["name"]
        if pname == "model":
            args_parts.append(f'model="res.partner"')
        elif pname == "domain":
            args_parts.append(f'domain=[["customer_rank", ">", 0]]')
        elif pname == "limit":
            args_parts.append(f"limit=20")
        elif pname == "fields":
            args_parts.append(f'fields=["name", "email", "phone"]')
        elif pname == "ids":
            args_parts.append(f"ids=[1, 2, 3]")
        elif pname == "name":
            args_parts.append(f'name="{_pick(PARTNER_NAMES)}"')
        elif pname == "vat":
            args_parts.append(f'vat="ES12345678A"')
        elif pname == "email":
            args_parts.append(f'email="contact@example.com"')
        elif pname == "partner_id":
            args_parts.append("partner_id=42")
        elif pname == "values":
            args_parts.append(f'values={{"name": "{_pick(PARTNER_NAMES)}", "email": "test@example.com"}}')
        elif pname == "res_id":
            args_parts.append("res_id=42")
        elif pname == "summary":
            args_parts.append(f'summary="{_pick(PROJECT_NAMES)}"')
        elif pname == "note":
            args_parts.append(f'note="Seguimiento mensual"')
        elif pname == "user_id":
            args_parts.append("user_id=5")
        elif pname == "date_deadline":
            args_parts.append('date_deadline="2025-12-31"')
        elif pname == "stage_id":
            args_parts.append("stage_id=3")
        elif pname == "assigned_to":
            args_parts.append("assigned_to=5")
        elif pname == "deadline":
            args_parts.append('deadline="2025-12-31"')
        elif pname == "description":
            args_parts.append(f'description="Descripción de la tarea"')
        elif pname == "state":
            args_parts.append(f'state="{_pick(STATES)}"')
        elif pname == "date_deadline_from":
            args_parts.append('date_deadline_from="2025-01-01"')
        elif pname == "date_deadline_to":
            args_parts.append('date_deadline_to="2025-12-31"')
        elif pname == "body":
            args_parts.append(f'body="Nota interna importante"')
        elif pname == "method":
            args_parts.append(f'method="action_confirm"')
        elif pname == "lines":
            args_parts.append("lines=[{...}]")
        elif pname == "ref":
            args_parts.append(f'ref="REF-{random.randint(1000, 9999)}"')
        elif pname == "chunk_size":
            args_parts.append("chunk_size=10")
        elif pname == "prefix":
            args_parts.append(f'prefix="chunk_{random.randint(100, 999)}"')
        elif pname == "file_paths":
            args_parts.append('file_paths=["/tmp/chunk_1.json"]')
        elif pname == "aggregation_type":
            args_parts.append('aggregation_type="list"')
        elif pname == "voice":
            args_parts.append(f'voice="{_pick(["es-ES-ElenaNeural", "en-US-JennyNeural"])}"')
        elif pname == "attachment_id":
            args_parts.append("attachment_id=100")
        elif pname == "data":
            args_parts.append("data=[{...}]")
        else:
            args_parts.append(f"{pname}=None")

    args_str = ", ".join(args_parts)
    tool_full = f"mcp_odoo-mcp_{name}"

    examples.append({
        "user": f"Usa {name} con valores realistas",
        "assistant": f"<|tool_call_start|>{tool_full}({args_str})<|tool_call_end|>",
        "category": "argument_filling",
        "tool_name": name,
    })

    return examples


def _gen_json_args(name: str, params: list) -> list[dict]:
    """Generate argument filling for JSON-schema tools."""
    examples = []
    args_parts = []

    for p in params:
        pname = p["name"]
        if pname == "text":
            args_parts.append(f'text="Hola mundo"')
        elif pname == "voice":
            args_parts.append(f'voice="es-ES-ElenaNeural"')
        elif pname == "attachment_id":
            args_parts.append("attachment_id=100")
        elif pname == "data":
            args_parts.append("data=[{...}]")
        elif pname == "chunk_size":
            args_parts.append("chunk_size=10")
        elif pname == "prefix":
            args_parts.append(f'prefix="chunk_{random.randint(100, 999)}"')
        elif pname == "file_paths":
            args_parts.append('file_paths=["/tmp/chunk_1.json"]')
        elif pname == "aggregation_type":
            args_parts.append('aggregation_type="list"')
        else:
            args_parts.append(f"{pname}=None")

    args_str = ", ".join(args_parts)
    server_prefix = name.split("-")[0] if "-" in name else "utils"
    tool_full = f"mcp_{server_prefix}_{name}"

    examples.append({
        "user": f"Llama a {name} con valores por defecto",
        "assistant": f"<|tool_call_start|>{tool_full}({args_str})<|tool_call_end|>",
        "category": "argument_filling",
        "tool_name": name,
    })

    return examples


# ---------------------------------------------------------------------------
# Error handling generator (balanced: 1 per tool)
# ---------------------------------------------------------------------------

def gen_error_handling(tool: dict) -> list[dict]:
    """Generate error_handling examples for a tool."""
    name = tool["name"]
    server = _get_server(tool)
    examples = []

    if server == "odoo-mcp":
        examples.append({
            "user": f"Error al llamar a {name}: permission denied",
            "assistant": f"<|tool_call_start|>mcp_odoo-mcp_{name}(...)<|tool_call_end|>\n\n[Error: permission denied — verificar permisos de usuario]",
            "category": "error_handling",
            "tool_name": name,
        })
    else:
        examples.append({
            "user": f"Error en {name}: servicio no disponible",
            "assistant": f"<|tool_call_start|>mcp_{name}_{name}(...)<|tool_call_end|>\n\n[Error: servicio no disponible — verificar configuración]",
            "category": "error_handling",
            "tool_name": name,
        })

    return examples


# ---------------------------------------------------------------------------
# Multi-turn conversation generator (1 per tool)
# ---------------------------------------------------------------------------

def gen_multi_turn(tool: dict) -> list[dict]:
    """Generate multi-turn examples involving a tool."""
    name = tool["name"]
    server = _get_server(tool)
    examples = []

    if server == "odoo-mcp":
        examples.append({
            "user": [
                f"¿Cuántos clientes tenemos?",
                f"<|tool_call_start|>mcp_odoo-mcp_{name}(model=\"res.partner\")<|tool_call_end|>",
                "Ahora muéstrame los primeros 10",
            ],
            "assistant": [
                f"<|tool_call_start|>mcp_odoo-mcp_{name}(model=\"res.partner\", limit=10)<|tool_call_end|>",
                None,
            ],
            "category": "multi_turn",
            "tool_name": name,
        })
    else:
        examples.append({
            "user": [
                f"¿Qué voces hay disponibles?",
                f"<|tool_call_start|>mcp_{name}_{name}()<|tool_call_end|>",
                "Usa la voz española para decir 'hola'",
            ],
            "assistant": [
                f"<|tool_call_start|>mcp_{name}_{name}(text=\"hola\", voice=\"es-ES-ElenaNeural\")<|tool_call_end|>",
                None,
            ],
            "category": "multi_turn",
            "tool_name": name,
        })

    return examples


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_dataset(metadata: list[dict], seed: int = 42) -> list[dict]:
    """Generate the full training dataset from tool metadata."""
    random.seed(seed)
    all_examples = []

    for tool in metadata:
        # Tool selection examples (3-5 per tool)
        all_examples.extend(gen_tool_selection(tool))

        # Argument filling examples (1 per tool)
        all_examples.extend(gen_argument_filling(tool))

        # Error handling examples (1 per tool)
        all_examples.extend(gen_error_handling(tool))

        # Multi-turn examples (1 per tool)
        all_examples.extend(gen_multi_turn(tool))

    # Global dedup by final user query content
    seen_queries = set()
    unique_examples = []
    for ex in all_examples:
        # For multi_turn, the last user message is the key
        if ex["category"] == "multi_turn":
            query = ex["user"][-1] if isinstance(ex["user"], list) else ex["user"]
        else:
            query = ex["user"]

        query_hash = hashlib.md5(query.encode()).hexdigest()
        if query_hash not in seen_queries:
            seen_queries.add(query_hash)
            unique_examples.append(ex)

    # Shuffle for training variety
    random.shuffle(unique_examples)

    return unique_examples


def main():
    if len(sys.argv) < 2:
        print("Usage: generator.py <metadata.json> [--output dataset.jsonl [--seed 42]]", file=sys.stderr)
        sys.exit(1)

    metadata_file = sys.argv[1]
    output = "dataset.jsonl"
    seed = 42

    for arg in sys.argv[2:]:
        if arg.startswith("--output"):
            output = arg.split("=", 1)[1] if "=" in arg else "dataset.jsonl"
        elif arg.startswith("--seed"):
            seed = int(arg.split("=", 1)[1]) if "=" in arg else 42

    with open(metadata_file, "r") as f:
        metadata = json.load(f)

    print(f"Generating dataset from {len(metadata)} tools (seed={seed})...", file=sys.stderr)
    examples = generate_dataset(metadata, seed=seed)

    # Write JSONL
    os.makedirs(os.path.dirname(output) if os.path.dirname(output) else ".", exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    # Print stats
    categories = {}
    for ex in examples:
        cat = ex["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print(f"Generated {len(examples)} examples:", file=sys.stderr)
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}", file=sys.stderr)

    # Tool coverage
    tools_used = set(ex["tool_name"] for ex in examples)
    print(f"Tool coverage: {len(tools_used)}/{len(metadata)} tools", file=sys.stderr)


if __name__ == "__main__":
    main()
