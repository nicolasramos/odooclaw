#!/usr/bin/env python3
"""
augment_dataset_v25e.py — Aumenta el dataset V25c con ejemplos sintéticos para
las 6 tools con baja cobertura, para llegar a >80% tool match.

Tools objetivo:
  - odoo_find_sale_order (0 ejemplos)
  - odoo_find_product (0 ejemplos)
  - odoo_find_pending_invoices (0 ejemplos)
  - odoo_find_partner (224 ejemplos)
  - odoo_confirm_sale_order (187 ejemplos)
  - odoo_create_task (673 ejemplos)

Cada ejemplo sintético replica el formato V25c:
  system: "Eres un asistente... HERRAMIENTAS DISPONIBLES: - <tool>: ..."
  user: prompt variado
  assistant: {"tool_calls": [{"function": {"name": "<tool>", "arguments": "..."}}]}

Uso:
  python3 augment_dataset_v25e.py --input datasets/v25c_train.jsonl --manifest finetuning/odooclaw_tool_manifest.json --output datasets/v25e_train.jsonl --per-tool 500
"""
import argparse
import json
import random
import sys
from collections import defaultdict

random.seed(42)

RUNTIME_PREFIX = "mcp_odoo-mcp_"


def runtime_name(name: str) -> str:
    return RUNTIME_PREFIX + name


def load_manifest(path: str) -> dict:
    with open(path) as f:
        mdata = json.load(f)
    tools = mdata["tools"]
    by_name = {}
    for t in tools:
        by_name[t["name"]] = t
    return {"tools": by_name, "raw": mdata}


def system_prompt_with_tools(tool_names: list[str], descriptions: dict) -> str:
    lines = [
        "Eres un asistente experto en Odoo ERP integrado con el sistema OdooClaw.",
        "Tienes acceso a las siguientes herramientas. Cuando necesites ejecutar una operación, ",
        "usa el formato <tool_call> con el nombre exacto de la herramienta y sus argumentos.",
        "",
        "HERRAMIENTAS DISPONIBLES:",
    ]
    for name in tool_names:
        desc = descriptions.get(name.replace(RUNTIME_PREFIX, ""), "")
        lines.append(f"- {name}: {desc}" if desc else f"- {name}")
    lines.append("")
    lines.append("IMPORTANTE: Solo puedes usar las herramientas listadas arriba. "
                 "Si ninguna es adecuada, responde sin herramientas.")
    return "\n".join(lines)


# ── Plantillas de prompts por tool ─────────────────────────────────────────
PROMPT_TEMPLATES = {
    "odoo_find_sale_order": [
        "Busca la orden de venta {ref}",
        "Busca la venta {ref}",
        "¿Puedes buscar el pedido de venta {ref}?",
        "Necesito el estado de la orden {ref}",
        "Localiza la orden de venta {ref}",
        "Busca la venta con referencia {ref}",
        "Quiero ver la orden {ref} del módulo de ventas",
        "¿En qué estado está la orden {ref}?",
    ],
    "odoo_find_product": [
        "¿Cuántos productos hay en el almacén principal?",
        "Busca el producto {product}",
        "¿Tienes información del producto {product}?",
        "Localiza el artículo {product}",
        "Busca productos que contengan '{term}'",
        "¿Cuál es el stock del producto {product}?",
        "Necesito encontrar el producto {product} en el catálogo",
        "Busca todos los productos de la categoría {cat}",
    ],
    "odoo_find_pending_invoices": [
        "¿Qué facturas están pendientes de pago?",
        "Lista las facturas sin pagar",
        "¿Cuáles son las facturas pendientes?",
        "Muéstrame las facturas abiertas",
        "¿Qué facturas de proveedor están pendientes?",
        "Necesito ver las facturas por cobrar",
        "¿Hay facturas vencidas pendientes?",
        "Lista las facturas pendientes del cliente {partner}",
    ],
    "odoo_find_partner": [
        "Busca el partner {partner}",
        "Localiza el cliente {partner}",
        "¿Tienes el contacto de {partner}?",
        "Busca la empresa {partner} en CRM",
        "Necesito el partner llamado {partner}",
        "¿Puedes buscar el contacto {partner}?",
        "Encuentra el cliente con nombre {partner}",
        "Busca el partner con email {email}",
    ],
    "odoo_confirm_sale_order": [
        "Confirma la orden de venta {ref}",
        "Confirma el pedido {ref}",
        "Acepta y confirma la venta {ref}",
        "Confirma la orden {ref} para que pase a siguiente fase",
        "Confirma el pedido de venta número {num}",
        "Valida y confirma la venta {ref}",
    ],
    "odoo_create_task": [
        "Añade una tarea al proyecto '{proj}'",
        "Crea una tarea en el proyecto {proj}",
        "Registra una nueva tarea para {proj}",
        "Crea una tarea titulada '{title}' en el proyecto {proj}",
        "Añade una tarea de seguimiento al proyecto {proj}",
        "Crea una tarea urgente en {proj}",
    ],
}

# ── Argumentos por tool ────────────────────────────────────────────────────
ARG_TEMPLATES = {
    "odoo_find_sale_order": lambda: {"name": random.choice(["SO/2026/00150", "SO/2026/00412", "SO/2025/01987", "SO/2026/00734"]), "limit": random.choice([5, 10, 20])},
    "odoo_find_product": lambda: {"name": random.choice(["PAPEL-A4", "TINTA-NEGRA", "CAJA-CARTON", "PORTATIL-X1", "SILLA-ERGONOMICA"]), "limit": random.choice([5, 10, 20])},
    "odoo_find_pending_invoices": lambda: {"state": "posted", "payment_state": "not_paid", "limit": random.choice([5, 10, 20])},
    "odoo_find_partner": lambda: {"name": random.choice(["ACME Corp", "TecnoSys SL", "Innova SA", "Grupo Norte", "DigitalWare"]), "limit": random.choice([5, 10, 20])},
    "odoo_confirm_sale_order": lambda: {"sale_order_id": random.choice([101, 123, 145, 210, 342])},
    "odoo_create_task": lambda: {"project_id": random.choice([3, 7, 12, 25, 41]), "title": random.choice(["Implementación", "Soporte Q3", "Migración datos", "Setup módulos", "Formación equipo"])},
}


def make_example(tool: str, descriptions: dict, all_tools: list[str], domains: dict) -> dict:
    """Construye un ejemplo sintético para la tool dada."""
    domain = domains.get(tool, "generic")
    # Elegir 5 tools: la correcta + 4 del mismo dominio (o aleatorias)
    same_domain = [t for t in all_tools if domains.get(t) == domain and t != tool]
    distractors = random.sample(same_domain, min(4, len(same_domain))) if same_domain else []
    while len(distractors) < 4:
        cand = random.choice(all_tools)
        if cand != tool and cand not in distractors:
            distractors.append(cand)
    available = [runtime_name(tool)] + [runtime_name(d) for d in distractors]
    random.shuffle(available)

    template = random.choice(PROMPT_TEMPLATES[tool])
    args = ARG_TEMPLATES[tool]()
    placeholders = {
        "ref": args.get("name") if "name" in args else random.choice(["SO/2026/00150", "SO/2026/00412"]),
        "num": str(args.get("sale_order_id", 123)),
        "product": args.get("name", "PAPEL-A4"),
        "term": args.get("name", "A4"),
        "cat": "Papelería",
        "partner": args.get("name", "ACME Corp"),
        "email": "contacto@acme.com",
        "proj": args.get("title", "Implementación"),
        "title": args.get("title", "Tarea nueva"),
    }
    prompt = template.format(**placeholders)

    system = system_prompt_with_tools(available, descriptions)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": prompt},
        {"role": "assistant", "content": "", "tool_calls": [
            {"id": f"call_{random.randint(10000, 99999)}", "type": "function",
             "function": {"name": runtime_name(tool), "arguments": json.dumps(args)}}
        ]},
    ]
    return {"messages": messages}


def main():
    parser = argparse.ArgumentParser(description="Aumenta dataset V25c con ejemplos sintéticos")
    parser.add_argument("--input", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--per-tool", type=int, default=500)
    args = parser.parse_args()

    manifest = load_manifest(args.manifest)
    all_tools = list(manifest["tools"].keys())
    domains = {name: t.get("domain", "generic") for name, t in manifest["tools"].items()}

    # Cargar dataset base
    with open(args.input) as f:
        base = [json.loads(line) for line in f]
    print(f"Base: {len(base)} ejemplos")

    # Generar sintéticos
    target_tools = list(PROMPT_TEMPLATES.keys())
    synthetic = []
    for tool in target_tools:
        for _ in range(args.per_tool):
            synthetic.append(make_example(tool, {}, all_tools, domains))
    print(f"Sintéticos: {len(synthetic)} ({args.per_tool} x {len(target_tools)} tools)")

    combined = base + synthetic
    random.shuffle(combined)
    print(f"Total V25e: {len(combined)}")

    with open(args.output, "w") as f:
        for rec in combined:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Guardado en: {args.output}")

    # Stats
    counter = defaultdict(int)
    for rec in synthetic:
        for m in rec["messages"]:
            for tc in (m.get("tool_calls") or []):
                counter[tc["function"]["name"]] += 1
    print("\nDistribución sintética:")
    for name, c in sorted(counter.items()):
        print(f"  {name}: {c}")


if __name__ == "__main__":
    main()
