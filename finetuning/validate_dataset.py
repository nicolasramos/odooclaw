#!/usr/bin/env python3
"""
validate_dataset.py — Valida datasets de fine-tuning contra el tool manifest de OdooClaw.

Valida que cada tool_call en un dataset JSONL (formato OpenAI tool_calls) exista en el
tool manifest y cumpla con las reglas de formato (arguments como JSON string, patrón de
confirmación para tools destructivas, etc.).

Uso:
    python validate_dataset.py --input dataset.jsonl
    python validate_dataset.py --input dataset.jsonl --fix --verbose
    python validate_dataset.py --input dataset.jsonl --output-report report.md
    python validate_dataset.py --check-manifest

Exit code: 0 si todo pasa, 1 si hay errores.
"""

import json
import sys
import argparse
from pathlib import Path


# ---------------------------------------------------------------------------
# Manifest helpers
# ---------------------------------------------------------------------------

def load_manifest(path):
    """Carga y retorna el tool manifest JSON."""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_tool_index(manifest):
    """Construye índices bidireccionales: nombre corto ↔ runtime name.

    Returns:
        short_names: dict {odoo_* -> tool_entry}
        runtime_names: dict {mcp_odoo-mcp_odoo_* -> tool_entry}
        prefix: string del runtime_prefix
    """
    prefix = manifest.get('runtime_prefix', '')
    short_names = {}
    runtime_names = {}
    for tool in manifest['tools']:
        name = tool['name']
        short_names[name] = tool
        runtime_names[prefix + name] = tool
    return short_names, runtime_names, prefix


def resolve_tool_name(name, short_names, runtime_names, prefix):
    """Resuelve un tool_name desde el dataset a su entrada en el manifest.

    Acepta tanto nombres cortos (odoo_*) como runtime names (mcp_odoo-mcp_odoo_*).

    Returns:
        (tool_entry, resolved_name, was_converted)
        tool_entry: dict del tool en manifest, o None si no se encuentra
        resolved_name: el nombre resuelto (runtime si se pudo)
        was_converted: True si el nombre original fue convertido
    """
    # Runtime match directo
    if name in runtime_names:
        return runtime_names[name], name, False
    # Nombre corto directo
    if name in short_names:
        return short_names[name], prefix + name, True
    # Intenta convertir short -> runtime
    runtime_name = prefix + name
    if runtime_name in runtime_names:
        return runtime_names[runtime_name], runtime_name, True
    # Intenta quitar prefix (runtime -> short)
    if name.startswith(prefix):
        short = name[len(prefix):]
        if short in short_names:
            return short_names[short], short, True
    return None, name, False


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def is_json_string(value):
    """True si value es un str que contiene JSON válido."""
    if not isinstance(value, str):
        return False
    try:
        json.loads(value)
        return True
    except (json.JSONDecodeError, ValueError):
        return False


def has_confirm_denial_pattern(messages, tool_call_msg_idx, tool_short_name):
    """Verifica si la conversación incluye confirmación/denegación para tool destructiva.

    Estrategias detectadas:
    1. El argumento 'confirm' o 'dry_run' aparece en los tool arguments
    2. El asistente preguntó por confirmación en mensajes recientes previos
    3. El usuario confirmó o denegó explícitamente después del tool call

    Returns:
        (bool, pattern_type): (encontrado, tipo_de_patrón)
    """
    CONFIRM_KEYWORDS = [
        'yes', 'confirm', 'proceed', 'go ahead', 'do it',
        'si', 'sí', 'confirma', 'adelante', 'ok', 'okay',
        'approved', 'approve', 'continue', 'claro', 'dale',
    ]
    DENIAL_KEYWORDS = [
        'no', 'cancel', 'stop', "don't", 'do not', 'never mind',
        'no hagas', 'cancela', 'detente', 'para', 'abort',
        'wait', 'espera',
    ]
    ASK_PHRASES = [
        'confirm', 'proceed', 'shall i', 'should i',
        'do you want', 'are you sure', 'confirma',
        'confirmación', 'proceder', 'estás seguro',
        'quieres que', 'necesito tu confirmación',
    ]

    # --- Strategy 1: Argumentos 'confirm' o 'dry_run' ---
    tool_calls = messages[tool_call_msg_idx].get('tool_calls', [])
    for tc in tool_calls:
        func = tc.get('function', {})
        # Match by short name or runtime name ending with short name
        fn_name = func.get('name', '')
        if not (fn_name == tool_short_name or fn_name.endswith(tool_short_name)):
            continue
        args_str = func.get('arguments', '{}')
        if isinstance(args_str, str):
            try:
                args = json.loads(args_str)
                if args.get('confirm') is True or args.get('dry_run') is True:
                    return True, 'confirm_arg'
            except json.JSONDecodeError:
                pass

    # --- Strategy 2: Assistant preguntó confirmación antes ---
    start = max(0, tool_call_msg_idx - 6)
    for i in range(start, tool_call_msg_idx):
        msg = messages[i]
        if msg.get('role') == 'assistant':
            content = msg.get('content') or ''
            if any(p in content.lower() for p in ASK_PHRASES):
                return True, 'assistant_ask'

    # --- Strategy 3: Usuario confirmó o denegó después ---
    end = min(len(messages), tool_call_msg_idx + 6)
    for i in range(tool_call_msg_idx + 1, end):
        msg = messages[i]
        if msg.get('role') == 'user':
            content = (msg.get('content') or '').lower()
            if any(k in content for k in CONFIRM_KEYWORDS):
                return True, 'user_confirm'
            if any(k in content for k in DENIAL_KEYWORDS):
                return True, 'user_denial'

    return False, None


# ---------------------------------------------------------------------------
# Main validation
# ---------------------------------------------------------------------------

def validate_dataset(manifest, dataset_path, *, fix=False, verbose=False,
                     max_errors=50, report_path=None):
    """Valida un dataset JSONL completo contra el tool manifest.

    Returns:
        (passed, stats_dict)
    """
    short_names, runtime_names, prefix = build_tool_index(manifest)
    manifest_tools = {t['name'] for t in manifest['tools']}

    errors = []
    warnings = []

    # Estadísticas
    total_examples = 0
    args_object_count = 0       # E1
    args_json_string_count = 0
    destructive_found = 0
    destructive_with_confirm = 0
    tools_seen = {}              # short_name -> count
    tools_hallucinated = set()   # nombres que no están en manifest
    tools_converted = set()      # nombres que fueron convertidos

    with open(dataset_path, 'r', encoding='utf-8') as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue

            total_examples += 1

            # Parsear línea JSONL
            try:
                example = json.loads(line)
            except json.JSONDecodeError as e:
                errors.append(f"Línea {line_no}: JSON inválido — {e}")
                if len(errors) >= max_errors:
                    break
                continue

            messages = example.get('messages', [])
            if not isinstance(messages, list):
                errors.append(f"Línea {line_no}: 'messages' no es una lista")
                if len(errors) >= max_errors:
                    break
                continue

            # --- Recorrer mensajes buscando tool_calls ---
            for msg_idx, msg in enumerate(messages):
                if not isinstance(msg, dict):
                    continue
                if msg.get('role') != 'assistant':
                    continue

                tool_calls = msg.get('tool_calls')
                if not tool_calls:
                    continue

                for tc_idx, tc in enumerate(tool_calls):
                    if not isinstance(tc, dict):
                        continue
                    func = tc.get('function', {})
                    if not isinstance(func, dict):
                        continue

                    tool_name = func.get('name', '')
                    arguments = func.get('arguments', '')

                    if not tool_name:
                        errors.append(
                            f"Línea {line_no} msg[{msg_idx}] tc[{tc_idx}]: "
                            f"tool_name vacío"
                        )
                        if len(errors) >= max_errors:
                            break
                        continue

                    # --- Validar E1: arguments debe ser JSON string ---
                    if not isinstance(arguments, str):
                        args_object_count += 1
                        errors.append(
                            f"Línea {line_no} msg[{msg_idx}] tc[{tc_idx}]: "
                            f"E1 — arguments es {type(arguments).__name__}, "
                            f"debe ser JSON string para '{tool_name}'"
                        )
                        if len(errors) >= max_errors:
                            break
                        continue
                    elif isinstance(arguments, str):
                        # Verificar que sea JSON válido
                        if arguments.strip():
                            try:
                                json.loads(arguments)
                            except json.JSONDecodeError as e:
                                errors.append(
                                    f"Línea {line_no} msg[{msg_idx}] tc[{tc_idx}]: "
                                    f"arguments JSON inválido para '{tool_name}': {e}"
                                )
                                if len(errors) >= max_errors:
                                    break
                                continue
                        args_json_string_count += 1
                    else:
                        args_object_count += 1
                        errors.append(
                            f"Línea {line_no} msg[{msg_idx}] tc[{tc_idx}]: "
                            f"E1 — arguments es objeto JSON, "
                            f"debe ser string para '{tool_name}'"
                        )
                        if len(errors) >= max_errors:
                            break
                        continue

                    # --- Resolver tool_name contra manifest ---
                    tool_entry, resolved_name, was_converted = resolve_tool_name(
                        tool_name, short_names, runtime_names, prefix
                    )

                    if tool_entry is None:
                        errors.append(
                            f"Línea {line_no} msg[{msg_idx}] tc[{tc_idx}]: "
                            f"Tool '{tool_name}' NO existe en manifest "
                            f"(posible alucinación)"
                        )
                        tools_hallucinated.add(tool_name)
                        if len(errors) >= max_errors:
                            break
                        continue

                    # Notificar conversión de nombre
                    if was_converted:
                        tools_converted.add(tool_name)
                        if fix:
                            warnings.append(
                                f"Línea {line_no} msg[{msg_idx}] tc[{tc_idx}]: "
                                f"'{tool_name}' → '{resolved_name}' "
                                f"(auto-corregido con --fix)"
                            )
                        elif verbose:
                            warnings.append(
                                f"Línea {line_no} msg[{msg_idx}] tc[{tc_idx}]: "
                                f"Nombre corto '{tool_name}' → "
                                f"runtime '{resolved_name}'"
                            )

                    # Registrar tool vista
                    short_name = tool_entry['name']
                    tools_seen[short_name] = tools_seen.get(short_name, 0) + 1

                    # --- Validar patrón confirm/denial para destructivas ---
                    if tool_entry.get('has_confirm'):
                        destructive_found += 1
                        has_pattern, pattern_type = has_confirm_denial_pattern(
                            messages, msg_idx, short_name
                        )
                        if has_pattern:
                            destructive_with_confirm += 1
                            if verbose:
                                warnings.append(
                                    f"Línea {line_no} msg[{msg_idx}] tc[{tc_idx}]: "
                                    f"Tool destructiva '{tool_name}' — "
                                    f"patrón confirm/denial: {pattern_type}"
                                )
                        else:
                            errors.append(
                                f"Línea {line_no} msg[{msg_idx}] tc[{tc_idx}]: "
                                f"Tool destructiva '{tool_name}' requiere patrón "
                                f"de confirmación/denegación — no detectado"
                            )
                            if len(errors) >= max_errors:
                                break

                if len(errors) >= max_errors:
                    break

    # ------------------------------------------------------------------
    # Compilar resultados
    # ------------------------------------------------------------------
    tools_untested = sorted(manifest_tools - set(tools_seen.keys()))
    tools_hallucinated_sorted = sorted(tools_hallucinated)

    passed = len(errors) == 0

    # --- Generar reporte Markdown ---
    report = []
    report.append("# Reporte de Validación de Dataset\n")
    report.append(f"- **Manifest**: {dataset_path.name}")
    report.append(f"- **Dataset**: {dataset_path.name}")
    report.append(f"- **Resultado**: {'✅ PASÓ' if passed else '❌ FALLÓ'}")
    report.append(f"- **Versión manifest**: {manifest.get('manifest_version', 'N/A')}")
    report.append(f"- **Runtime prefix**: `{prefix}`\n")

    report.append("## Estadísticas\n")
    report.append(f"| Métrica | Valor |")
    report.append(f"|---------|------:|")
    report.append(f"| Total ejemplos JSONL | {total_examples} |")
    report.append(f"| Tool calls con arguments JSON string ✅ | {args_json_string_count} |")
    report.append(f"| Tool calls con arguments objeto JSON ❌ (E1) | {args_object_count} |")
    report.append(f"| Tools destructivas encontradas | {destructive_found} |")
    report.append(f"| Tools destructivas con confirm/denial ✅ | {destructive_with_confirm} |")
    report.append(f"| Tools destructivas SIN confirm/denial ❌ | {destructive_found - destructive_with_confirm} |")
    report.append(f"| Tools únicas en dataset | {len(tools_seen)} |")
    report.append(f"| Tools en manifest NO cubiertas | {len(tools_untested)} |")
    report.append(f"| Tools en dataset NO en manifest (alucinaciones) | {len(tools_hallucinated)} |")
    report.append(f"| Errores totales | {len(errors)} |")
    report.append(f"| Advertencias totales | {len(warnings)} |\n")

    # Tools más usadas en dataset
    if tools_seen:
        report.append("## Top tools en dataset\n")
        report.append("| Tool | Usos |")
        report.append("|------|-----:|")
        for t, cnt in sorted(tools_seen.items(), key=lambda x: -x[1])[:20]:
            report.append(f"| `{t}` | {cnt} |")
        report.append("")

    # Tools alucinadas
    if tools_hallucinated_sorted:
        report.append("## Alucinaciones (tools en dataset NO en manifest)\n")
        report.append("Estos tool_names no existen en el manifest. Posibles errores de generación.\n")
        for t in tools_hallucinated_sorted:
            report.append(f"- `{t}`")
        report.append("")

    # Tools no cubiertas
    if tools_untested:
        report.append("## Tools NO cubiertas (en manifest pero sin ejemplos en dataset)\n")
        report.append("Estas herramientas del manifest no tienen ningún ejemplo en el dataset.\n")
        for t in tools_untested:
            report.append(f"- `{t}`")
        report.append("")

    # Tools con nombres convertidos
    if tools_converted:
        report.append("## Nombres convertidos\n")
        report.append("Estos tool_names fueron convertidos de short name a runtime name.\n")
        for t in sorted(tools_converted):
            report.append(f"- `{t}` → `{prefix}{t}`")
        report.append("")

    # Errores detallados
    if errors:
        report.append(f"## Errores ({len(errors)})\n")
        for i, err in enumerate(errors[:100], 1):
            report.append(f"{i:>4}. {err}")
        if len(errors) > 100:
            report.append(f"\n... y {len(errors) - 100} errores más (--max-errors para ver más)")
        report.append("")

    # Advertencias detalladas
    if warnings and verbose:
        report.append(f"## Advertencias ({len(warnings)})\n")
        for i, w in enumerate(warnings[:50], 1):
            report.append(f"{i:>4}. {w}")
        if len(warnings) > 50:
            report.append(f"\n... y {len(warnings) - 50} advertencias más")
        report.append("")

    report_text = "\n".join(report)

    # Escribir reporte a archivo
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(report_text, encoding='utf-8')
        print(f"Reporte guardado en: {report_path}")

    # Mostrar resumen en stdout
    if verbose or not passed:
        print(report_text)

    # Stats summary
    stats = {
        'total_examples': total_examples,
        'args_object_count': args_object_count,
        'args_json_string_count': args_json_string_count,
        'destructive_found': destructive_found,
        'destructive_with_confirm': destructive_with_confirm,
        'tools_seen': len(tools_seen),
        'tools_untested': tools_untested,
        'tools_hallucinated': tools_hallucinated_sorted,
        'tools_converted': sorted(tools_converted),
        'error_count': len(errors),
        'warning_count': len(warnings),
    }

    return passed, stats


def check_manifest_only(manifest, manifest_path, verbose=False):
    """Valida y muestra información del manifest sin dataset."""
    short_names, runtime_names, prefix = build_tool_index(manifest)

    lines = []
    lines.append("# Validación de Manifest\n")
    lines.append(f"- **Archivo**: {manifest_path.name}")
    lines.append(f"- **Versión**: {manifest.get('manifest_version', 'N/A')}")
    lines.append(f"- **Server**: {manifest.get('server_name', 'N/A')}")
    lines.append(f"- **Runtime prefix**: `{prefix}`")
    lines.append(f"- **Total tools**: {len(manifest['tools'])}\n")

    # Clasificar por dominio
    domains = {}
    destructive_list = []
    non_destructive_list = []
    for t in manifest['tools']:
        d = t.get('domain', 'unknown')
        domains.setdefault(d, []).append(t['name'])
        if t.get('destructive'):
            destructive_list.append(t)
        else:
            non_destructive_list.append(t)

    lines.append(f"**Destructivas**: {len(destructive_list)}")
    lines.append(f"**No destructivas**: {len(non_destructive_list)}")
    lines.append(f"**Dominios**: {len(domains)}\n")

    # Tools destructivas
    lines.append("### Tools Destructivas\n")
    lines.append("| Tool | Runtime Name | Confirm | Dry Run | Dominio |")
    lines.append("|------|-------------|:-------:|:-------:|:-------:|")
    for t in sorted(destructive_list, key=lambda x: x['name']):
        runtime = f"`{prefix}{t['name']}`"
        confirm = "✅" if t.get('has_confirm') else "—"
        dry_run = "✅" if t.get('has_dry_run') else "—"
        lines.append(f"| `{t['name']}` | {runtime} | {confirm} | {dry_run} | {t.get('domain', '?')} |")
    lines.append("")

    # Tools por dominio
    lines.append("### Tools por Dominio\n")
    lines.append("| Dominio | Cantidad | Tools |")
    lines.append("|---------|:--------:|-------|")
    for d in sorted(domains.keys()):
        tools_list = domains[d]
        tools_preview = ", ".join(f"`{t}`" for t in sorted(tools_list)[:6])
        if len(tools_list) > 6:
            tools_preview += f" … y {len(tools_list)-6} más"
        lines.append(f"| {d} | {len(tools_list)} | {tools_preview} |")
    lines.append("")

    report_text = "\n".join(lines)

    if verbose:
        print(report_text)

    return report_text


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Valida datasets de fine-tuning contra el tool manifest de OdooClaw.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  %(prog)s --input dataset.jsonl
  %(prog)s --input dataset.jsonl --fix --verbose
  %(prog)s --input dataset.jsonl --output-report report.md --max-errors 100
  %(prog)s --check-manifest
  %(prog)s --check-manifest --manifest odooclaw_tool_manifest.json
        """,
    )
    parser.add_argument(
        '--manifest',
        default='odooclaw_tool_manifest.json',
        help='Ruta al tool manifest JSON (default: odooclaw_tool_manifest.json)',
    )
    parser.add_argument(
        '--input',
        help='Ruta al dataset JSONL a validar',
    )
    parser.add_argument(
        '--output-report',
        help='Ruta para guardar el reporte Markdown',
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Modo verbose: imprime todo durante la validación',
    )
    parser.add_argument(
        '--max-errors',
        type=int,
        default=50,
        help='Máximo de errores antes de abortar (default: 50)',
    )
    parser.add_argument(
        '--fix',
        action='store_true',
        help='Auto-corrige nombres cortos (odoo_*) a runtime names (mcp_odoo-mcp_odoo_*)',
    )
    parser.add_argument(
        '--check-manifest',
        action='store_true',
        help='Solo valida el manifest, sin procesar dataset',
    )

    args = parser.parse_args()

    # ------------------------------------------------------------------
    # Cargar manifest
    # ------------------------------------------------------------------
    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        print(f"ERROR: Manifest no encontrado: {manifest_path}", file=sys.stderr)
        sys.exit(1)

    try:
        manifest = load_manifest(manifest_path)
    except (json.JSONDecodeError, KeyError) as e:
        print(f"ERROR: Manifest inválido: {e}", file=sys.stderr)
        sys.exit(1)

    if 'tools' not in manifest or not isinstance(manifest['tools'], list):
        print("ERROR: Manifest no contiene 'tools' como lista", file=sys.stderr)
        sys.exit(1)

    print(f"Manifest cargado: {manifest_path.name} — "
          f"{len(manifest['tools'])} tools, "
          f"versión {manifest.get('manifest_version', '?')}")

    # ------------------------------------------------------------------
    # Modo --check-manifest
    # ------------------------------------------------------------------
    if args.check_manifest:
        check_manifest_only(manifest, manifest_path, verbose=True)
        sys.exit(0)

    # ------------------------------------------------------------------
    # Modo validación de dataset
    # ------------------------------------------------------------------
    if not args.input:
        print("ERROR: Se requiere --input para validar un dataset "
              "(o use --check-manifest)", file=sys.stderr)
        sys.exit(1)

    dataset_path = Path(args.input)
    if not dataset_path.exists():
        print(f"ERROR: Dataset no encontrado: {dataset_path}", file=sys.stderr)
        sys.exit(1)

    report_path = Path(args.output_report) if args.output_report else None

    print(f"Dataset: {dataset_path.name}")
    print(f"Max errores: {args.max_errors}")
    print(f"Fix mode: {'ON' if args.fix else 'OFF'}")
    if report_path:
        print(f"Reporte: {report_path}")
    print()

    passed, stats = validate_dataset(
        manifest,
        dataset_path,
        fix=args.fix,
        verbose=args.verbose,
        max_errors=args.max_errors,
        report_path=report_path,
    )

    # ------------------------------------------------------------------
    # Resultado final
    # ------------------------------------------------------------------
    if args.verbose or not passed:
        print("=" * 60)

    if passed:
        print(
            f"✅ VALIDACIÓN PASÓ — "
            f"{stats['total_examples']} ejemplos, "
            f"{stats['tools_seen']} tools únicas, "
            f"{stats['error_count']} errores, "
            f"{stats['warning_count']} advertencias"
        )
    else:
        print(
            f"❌ VALIDACIÓN FALLÓ — "
            f"{stats['error_count']} errores, "
            f"{stats['warning_count']} advertencias"
        )
        if stats['tools_hallucinated']:
            print(f"   Alucinaciones: {', '.join(stats['tools_hallucinated'][:10])}")
        if stats['tools_untested']:
            print(f"   Tools no cubiertas: {len(stats['tools_untested'])}")

    sys.exit(0 if passed else 1)


if __name__ == '__main__':
    main()
