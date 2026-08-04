#!/usr/bin/env python3
"""
prepare_retrieval_dataset.py — Prepara dataset V25c simulando Tool Retrieval Engine.

Cada ejemplo incluye SOLO 3-5 tools relevantes (como haría el retriever en producción)
en lugar de las 124 tools completas. El modelo solo debe elegir entre esas pocas.

Uso:
  python3 prepare_retrieval_dataset.py \
    --input datasets/v25b_train.jsonl \
    --output datasets/v25c_train.jsonl \
    --manifest finetuning/odooclaw_tool_manifest.json \
    --tools-per-example 5
"""
import argparse
import json
import random
import sys
from pathlib import Path


def load_manifest(path):
    with open(path) as f:
        data = json.load(f)
    tools = {t["name"]: t for t in data["tools"]}
    return tools, data.get("runtime_prefix", "mcp_odoo-mcp_")


def get_domain(tool_name: str, manifest: dict) -> str:
    """Extrae dominio de la tool del manifest."""
    # Quitar prefijo runtime
    for prefix in ["mcp_odoo-mcp_", "mcp_"]:
        if tool_name.startswith(prefix):
            tool_name = tool_name[len(prefix):]
    entry = manifest.get(tool_name, {})
    return entry.get("domain", "generic")


def build_system_prompt(tools_subset: list[dict]) -> str:
    """Construye system prompt con SOLO las tools del subset."""
    lines = [
        "Eres un asistente experto en Odoo ERP integrado con el sistema OdooClaw.",
        "Tienes acceso a las siguientes herramientas. Cuando necesites ejecutar una operación, ",
        "usa el formato <tool_call> con el nombre exacto de la herramienta y sus argumentos.",
        "",
        "HERRAMIENTAS DISPONIBLES:",
    ]
    for t in tools_subset:
        name = t["name"]
        domain = t.get("domain", "generic")
        desc = t.get("description", f"Herramienta de {domain}")
        lines.append(f"- {name}: {desc}")
    lines.append("")
    lines.append("IMPORTANTE: Solo puedes usar las herramientas listadas arriba. "
                  "Si ninguna es adecuada, responde sin herramientas.")
    return "\n".join(lines)


def select_distractors(correct_tool: str, manifest: dict, n: int = 4) -> list[str]:
    """Selecciona n tools distractoras del mismo dominio."""
    domain = get_domain(correct_tool, manifest)
    # Tools del mismo dominio (excluyendo la correcta)
    same_domain = [
        name for name, info in manifest.items()
        if info.get("domain") == domain and f"mcp_odoo-mcp_{name}" != correct_tool
    ]
    # Si no hay suficientes del mismo dominio, añadir de otros
    others = [
        name for name in manifest.keys()
        if manifest[name].get("domain") != domain and f"mcp_odoo-mcp_{name}" != correct_tool
    ]
    candidates = same_domain + others
    random.shuffle(candidates)
    selected = candidates[:n]
    # Añadir prefijo runtime
    return [f"mcp_odoo-mcp_{s}" for s in selected]


def process_example(example: dict, manifest: dict, tools_per_example: int) -> dict:
    """Procesa un ejemplo: encuentra la tool correcta, selecciona distractoras, arma system prompt."""
    messages = example["messages"]
    correct_tool = None
    for m in messages:
        if m.get("tool_calls"):
            for tc in m["tool_calls"]:
                correct_tool = tc["function"]["name"]
                break
        if correct_tool:
            break

    if not correct_tool:
        # Ejemplo sin tool calls (negativo/noop) — incluir tools aleatorias
        all_tools = list(manifest.keys())
        random.shuffle(all_tools)
        selected = [f"mcp_odoo-mcp_{t}" for t in all_tools[:tools_per_example]]
    else:
        # Tool correcta + distractoras
        distractors = select_distractors(correct_tool, manifest, tools_per_example - 1)
        selected = [correct_tool] + distractors
        random.shuffle(selected)

    # Construir tool entries con info del manifest
    tool_entries = []
    for name in selected:
        short_name = name.replace("mcp_odoo-mcp_", "").replace("mcp_", "")
        entry = manifest.get(short_name, {})
        tool_entries.append({
            "name": name,
            "domain": entry.get("domain", "generic"),
            "description": f"Herramienta de {entry.get('domain', 'generic')}",
        })

    # Reemplazar system prompt
    new_system = build_system_prompt(tool_entries)
    for m in messages:
        if m["role"] == "system":
            m["content"] = new_system
            break

    return example


def main():
    parser = argparse.ArgumentParser(description="Prepara dataset con Tool Retrieval simulado")
    parser.add_argument("--input", required=True, help="Dataset V25b JSONL input")
    parser.add_argument("--output", required=True, help="Dataset V25c JSONL output")
    parser.add_argument("--manifest", required=True, help="Tool manifest JSON")
    parser.add_argument("--tools-per-example", type=int, default=5,
                        help="Tools por ejemplo (3-5 recomendado)")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    random.seed(args.seed)
    manifest, prefix = load_manifest(args.manifest)

    total = 0
    with_tools = 0
    with open(args.input) as f_in, open(args.output, "w") as f_out:
        for line in f_in:
            example = json.loads(line)
            processed = process_example(example, manifest, args.tools_per_example)
            f_out.write(json.dumps(processed, ensure_ascii=False) + "\n")
            total += 1
            if any(m.get("tool_calls") for m in processed["messages"]):
                with_tools += 1

    if args.verbose:
        print(f"Total: {total}")
        print(f"Con tools: {with_tools} ({100*with_tools/total:.1f}%)")
        print(f"Tools por ejemplo: {args.tools_per_example}")
        print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
