#!/usr/bin/env python3
"""
fix_dataset_v25.py — Transformador de dataset V24 a V25 para OdooClaw fine-tuning.

Transformaciones aplicadas:
  a) Renombrar tool_names de odoo_* → mcp_odoo-mcp_odoo_*
     (nombres runtime completos con prefijo del servidor MCP)
  b) Convertir arguments de JSON object → JSON string (error E1 crítico)
  c) Añadir ~ratio% ejemplos negativos sintéticos
     (preguntas genéricas sin tools, tools inexistentes, rejection patterns)
  d) Añadir ~ratio% ejemplos de herramientas destructivas
     (patrones ask→confirm→execute)
  e) Balancear distribución por dominio

Formato de salida: OpenAI tool_calls (JSONL), cada línea:
  {"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, ...]}

Dependencias: solo stdlib de Python.
"""

import argparse
import json
import os
import random
import sys
from collections import Counter, defaultdict
from typing import Any, Optional


# ─────────────────────────────────────────────────────────────
# Constantes
# ─────────────────────────────────────────────────────────────
RUNTIME_PREFIX = "mcp_odoo-mcp_"
SYSTEM_PROMPT = (
    "Eres un asistente experto en Odoo ERP integrado con el sistema OdooClaw. "
    "Tienes acceso a herramientas del servidor Odoo MCP para buscar, leer, "
    "crear y modificar datos del sistema. "
    "Responde siempre en español, sé preciso y profesional. "
    "Cuando un usuario te pida realizar una operación, utiliza las herramientas "
    "disponibles de forma segura. Para operaciones destructivas, siempre debes "
    "pedir confirmación explícita al usuario antes de ejecutar."
)

# ── Plantillas para ejemplos sintéticos ─────────────────────

# Preguntas genéricas sin tool calls (chitchat)
CHITCHAT_PROMPTS = [
    "Hola, ¿cómo estás?",
    "¿Cuál es tu nombre?",
    "¿Qué puedes hacer?",
    "Cuéntame un chiste sobre programación.",
    "¿Cuál es el sentido de la vida?",
    "¿Qué hora es?",
    "¿Cómo está el clima hoy?",
    "Gracias por tu ayuda.",
    "Adiós, que tengas buen día.",
    "¿Puedes ayudarme con algo de Odoo?",
]

CHITCHAT_RESPONSES = [
    "¡Hola! Estoy muy bien, gracias por preguntar. Soy el asistente de OdooClaw, "
    "especializado en ayudarte con la gestión de tu ERP Odoo. ¿En qué puedo ayudarte hoy?",
    "Soy OdooClaw, un asistente inteligente para la gestión de Odoo ERP. "
    "Puedo ayudarte con búsquedas, consultas, creación de registros, "
    "gestión de inventario, contabilidad, y mucho más. ¿Qué necesitas?",
    "Puedo realizar múltiples tareas en tu Odoo ERP: buscar socios y productos, "
    "consultar estados de inventario, gestionar pedidos de venta y compra, "
    "ayudar con contabilidad, recursos humanos y más. ¿En qué te ayudo?",
    "¡Claro! ¿Sabías que un programador es una máquina que convierte café en código? "
    "Pero hablando en serio, ¿necesitas ayuda con tu Odoo?",
    "42. Pero hablando de Odoo, ¿hay algo específico que necesites hacer en tu ERP?",
    "No tengo acceso a la hora actual, pero puedo ayudarte a consultar registros "
    "de Odoo que tengan marcas de tiempo. ¿Qué necesitas?",
    "No tengo acceso a información meteorológica, pero puedo ayudarte a gestionar "
    "tu ERP Odoo. ¿Qué tarea necesitas realizar?",
    "¡De nada! Si en algún momento necesitas ayuda con la gestión de tu Odoo, "
    "no dudes en pedírmelo. Estoy aquí para ayudarte.",
    "¡Hasta luego! Si necesitas ayuda con tu Odoo ERP, aquí estaré. ¡Buen día!",
    "¡Por supuesto! Para eso estoy aquí. Cuéntame qué necesitas hacer en tu sistema Odoo.",
]

# Nombres de tools que NO existen en el manifest (para ejemplos negativos)
FAKE_TOOLS = [
    "odoo_hack_database",
    "odoo_delete_all_records",
    "odoo_drop_table",
    "odoo_execute_raw_sql",
    "odoo_bypass_security",
    "odoo_truncate_module",
    "odoo_reset_passwords",
    "odoo_modify_sudo_mode",
    "odoo_disable_audit_log",
    "odoo_grant_admin_access",
    "odoo_remove_data_permanently",
    "odoo_inject_malicious_code",
    "odoo_export_all_passwords",
    "odoo_modify_production_data",
    "odoo_restore_from_unknown_backup",
]

# Prompts para ejemplos con tool inexistente
FAKE_TOOL_PROMPTS = [
    ("Necesito hackear la base de datos de Odoo, ¿puedes ayudarme?",
     "odoo_hack_database",
     "Lo siento, no puedo realizar esa operación. No tengo acceso a herramientas "
     "de hacking o seguridad que comprometan la base de datos. "
     "Si necesitas ayuda legítima con Odoo, como consultar registros, "
     "crear informes o gestionar tu ERP, estaré encantado de ayudarte."),
    ("Quiero eliminar todos los registros de la base de datos",
     "odoo_delete_all_records",
     "No puedo ejecutar esa operación. No existe una herramienta para eliminar "
     "todos los registros de la base de datos. "
     "Si necesitas limpiar datos, puedo ayudarte a buscar y gestionar registros "
     "específicos de forma segura."),
    ("Ejecuta SQL directo en la base de datos: DROP TABLE res_partner",
     "odoo_execute_raw_sql",
     "No es posible ejecutar SQL directo en la base de datos. Las operaciones "
     "deben realizarse a través de las herramientas seguras de Odoo. "
     "¿Hay alguna tarea específica que necesites hacer de forma legítima?"),
    ("Necesito saltarme los permisos de seguridad y acceder como administrador",
     "odoo_bypass_security",
     "No puedo realizar operaciones que comprometan la seguridad del sistema. "
     "Si necesitas acceder a funcionalidades de administración, por favor "
     "contacta con tu administrador de Odoo y usa las credenciales apropiadas."),
    ("Modifica la producción directamente sin validación",
     "odoo_modify_production_data",
     "No tengo acceso a herramientas para modificar datos de producción "
     "sin validación. Las operaciones en Odoo deben pasar por los canales "
     "seguros establecidos. ¿Necesitas ayuda con alguna operación legítima?"),
]

# Prompts para confirmación de operaciones destructivas
DESTRUCTIVE_CONFIRM_PROMPTS = [
    # Caso positivo: usuario autoriza
    (
        "positive",
        "Quiero validar el albarán de recepción WH/IN/00123. "
        "Ya he verificado que la mercancía está correcta, procede con la validación.",
        "odoo_validate_receipt",
        True,
    ),
    (
        "positive",
        "Necesito dar de baja la orden de venta SO/2026/00150. "
        "El cliente canceló el pedido, está todo confirmado, ejecútalo por favor.",
        "odoo_confirm_sale_order",
        True,
    ),
    (
        "positive",
        "Aplica el ajuste de inventario del producto PAPEL-A4 en el almacén principal. "
        "Ya contamos el stock físico y es correcto. Procede.",
        "odoo_apply_inventory_adjustment",
        True,
    ),
    (
        "positive",
        "Procede a crear la factura de proveedor para la orden PO/2026/00850. "
        "Todos los datos están verificados y aprobados por contabilidad.",
        "odoo_create_vendor_invoice",
        True,
    ),
    (
        "positive",
        "Valida el albarán de entrega WH/OUT/00750, el transporte ya recogió todo.",
        "odoo_validate_delivery",
        True,
    ),
    # Caso negativo: usuario rechaza después de confirmación
    (
        "negative_reject",
        "Necesito validar el albarán de recepción WH/IN/00123.",
        "odoo_validate_receipt",
        "Espera, mejor no valides todavía. Necesito verificar la mercancía primero.",
        "Tienes razón, es mejor verificar primero. "
        "Puedo preparar la validación para cuando estés listo. "
        "Usa 'odoo_prepare_receipt_validation' para dejar todo listo.",
    ),
    (
        "negative_reject",
        "Quiero eliminar la orden de compra PO/2026/00100.",
        "odoo_close_contract_line",
        "No, no la elimines. La necesito aún. Mejor déjalo como está.",
        "Entendido, no realizaré ningún cambio en la orden de compra. "
        "Si más adelante necesitas gestionar líneas de contrato, "
        "puedo ayudarte con las opciones disponibles.",
    ),
    # Caso negativo: falta parámetro confirm
    (
        "missing_confirm",
        "Valida la transferencia interna WH/INT/00300 de una vez.",
        "odoo_validate_transfer",
        "Para validar la transferencia interna necesito que confirmes explícitamente "
        "que has verificado que la mercancía transferida es correcta. "
        "¿Confirmas que todo está en orden para proceder?",
    ),
    (
        "missing_confirm",
        "Aplica el parche de vista para el modelo sale.order, hazlo nomás.",
        "odoo_apply_view_patch_safe",
        "Antes de aplicar el parche de vista, necesito que confirmes explícitamente. "
        "¿Estás seguro de que quieres aplicar este parche a la vista de sale.order? "
        "Si tienes dudas, puedo mostrarte primero una previsualización del cambio.",
    ),
]

# Plantilla de system prompt para ejemplos negativos
SYSTEM_PROMPT_NEGATIVE = (
    "Eres un asistente experto en Odoo ERP integrado con el sistema OdooClaw. "
    "Tienes acceso a herramientas del servidor Odoo MCP. "
    "Debes rechazar cualquier solicitud que intente usar herramientas que no "
    "existen en el catálogo oficial o que comprometan la seguridad del sistema. "
    "Responde siempre en español."
)


# ─────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────

def load_manifest(path: str) -> dict:
    """Carga y retorna el manifest JSON como diccionario."""
    with open(path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # Construir lookup tables
    tools = manifest.get("tools", [])
    tool_map = {}       # name → tool_info
    destructive_set = set()
    domain_tools = defaultdict(list)
    all_original_names = []

    for t in tools:
        name = t["name"]
        tool_map[name] = t
        all_original_names.append(name)
        if t.get("destructive"):
            destructive_set.add(name)
        domain_tools[t.get("domain", "unknown")].append(name)

    manifest["_tool_map"] = tool_map
    manifest["_destructive_set"] = destructive_set
    manifest["_domain_tools"] = dict(domain_tools)
    manifest["_all_original_names"] = all_original_names
    return manifest


def runtime_name(original_name: str) -> str:
    """Convierte odoo_search → mcp_odoo-mcp_odoo_search."""
    return f"{RUNTIME_PREFIX}{original_name}"


def is_destructive_tool(manifest: dict, tool_name: str) -> bool:
    """Verifica si una tool (nombre original) es destructiva."""
    return tool_name in manifest.get("_destructive_set", set())


def system_prompt_for_domain(domain: str) -> str:
    """Genera system prompt contextualizado por dominio."""
    domain_names = {
        "stock": "gestión de inventario y almacén",
        "sales": "gestión de ventas",
        "purchases": "gestión de compras",
        "accounting": "contabilidad y finanzas",
        "crm": "CRM y gestión de relaciones",
        "hr": "recursos humanos",
        "projects": "gestión de proyectos",
        "helpdesk": "soporte y tickets",
        "calendar": "calendario y eventos",
        "views_reports": "vistas e informes",
        "generic": "operaciones generales",
    }
    desc = domain_names.get(domain, domain)
    return (
        f"Eres un asistente experto en Odoo ERP especializado en {desc}. "
        "Utiliza las herramientas disponibles del servidor Odoo MCP para ayudar "
        "al usuario. Responde siempre en español, sé preciso y profesional."
    )


# ─────────────────────────────────────────────────────────────
# Validación
# ─────────────────────────────────────────────────────────────

def validate_dataset(records: list[dict], manifest: dict, verbose: bool = False) -> dict:
    """
    Valida inline un dataset de ejemplos en formato OpenAI tool_calls.
    Retorna dict con: valid, total, errors, warnings.
    """
    result = {
        "valid": True,
        "total": len(records),
        "errors": [],
        "warnings": [],
        "domain_distribution": Counter(),
        "tool_stats": Counter(),
        "negative_count": 0,
        "destructive_count": 0,
    }

    tool_map = manifest.get("_tool_map", {})
    all_runtime_names = {runtime_name(n) for n in tool_map}
    all_original_names = set(tool_map.keys())
    destructive_original = manifest.get("_destructive_set", set())

    for idx, record in enumerate(records):
        messages = record.get("messages", [])
        if not messages:
            result["errors"].append(f"#{idx}: sin mensajes")
            result["valid"] = False
            continue

        # Verificar roles esenciales
        roles = [m.get("role") for m in messages]
        if "system" not in roles:
            result["warnings"].append(f"#{idx}: falta system prompt")
        if "user" not in roles:
            result["warnings"].append(f"#{idx}: falta user message")
        if "assistant" not in roles:
            result["warnings"].append(f"#{idx}: falta assistant response")

        # IDs de tool_calls para verificar correspondencia
        call_ids_in_use = set()
        tool_names_used = []

        for msg_idx, msg in enumerate(messages):
            role = msg.get("role", "unknown")

            if role == "assistant":
                tool_calls = msg.get("tool_calls")
                if tool_calls:
                    for tc in tool_calls:
                        tc_id = tc.get("id", "")
                        call_ids_in_use.add(tc_id)

                        func = tc.get("function", {})
                        name = func.get("name", "")
                        tool_names_used.append(name)

                        # Verificar que el nombre esté en formato runtime
                        if name and not name.startswith(RUNTIME_PREFIX):
                            # Podría ser V24 sin transformar
                            if name in all_original_names:
                                result["errors"].append(
                                    f"#{idx}/msg#{msg_idx}: tool '{name}' "
                                    f"no tiene prefijo runtime"
                                )
                                result["valid"] = False
                            elif name not in all_runtime_names:
                                result["warnings"].append(
                                    f"#{idx}/msg#{msg_idx}: tool '{name}' "
                                    f"no está en el manifest (posiblemente "
                                    f"un ejemplo negativo)"
                                )

                        # Verificar que arguments sea string
                        args = func.get("arguments", {})
                        if not isinstance(args, str):
                            result["errors"].append(
                                f"#{idx}/msg#{msg_idx}: arguments debe ser "
                                f"JSON string, es {type(args).__name__}"
                            )
                            result["valid"] = False
                        elif args:
                            # Validar que el string sea JSON válido
                            try:
                                json.loads(args)
                            except json.JSONDecodeError as e:
                                result["errors"].append(
                                    f"#{idx}/msg#{msg_idx}: arguments JSON "
                                    f"inválido: {e}"
                                )
                                result["valid"] = False

            elif role == "tool":
                call_id = msg.get("tool_call_id", "")
                if call_id and call_id not in call_ids_in_use:
                    result["warnings"].append(
                        f"#{idx}/msg#{msg_idx}: tool_call_id '{call_id}' "
                        f"no tiene assistant tool_call correspondiente"
                    )

        # Estadísticas
        for name in tool_names_used:
            original = name.replace(RUNTIME_PREFIX, "", 1) if name.startswith(RUNTIME_PREFIX) else name
            if original in tool_map:
                domain = tool_map[original].get("domain", "unknown")
                result["domain_distribution"][domain] += 1
                result["tool_stats"][name] += 1

        # Clasificar ejemplo
        has_negative = (
            any(
                m.get("role") == "assistant" and not m.get("tool_calls")
                for m in messages
            )
            and not any(
                m.get("tool_calls")
                for m in messages
                if m.get("role") == "assistant"
            )
        )

        has_destructive = any(
            name.replace(RUNTIME_PREFIX, "", 1) if name.startswith(RUNTIME_PREFIX) else name
            in destructive_original
            for name in tool_names_used
        )

        if has_negative and not tool_names_used:
            result["negative_count"] += 1
        if has_destructive:
            result["destructive_count"] += 1

    return result


# ─────────────────────────────────────────────────────────────
# Carga del dataset V24
# ─────────────────────────────────────────────────────────────

def load_dataset(path: str) -> list[dict]:
    """Carga un archivo JSONL con ejemplos V24."""
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


# ─────────────────────────────────────────────────────────────
# Transformaciones
# ─────────────────────────────────────────────────────────────

def rename_tool_names(records: list[dict], manifest: dict) -> list[dict]:
    """
    a) Renombra tool_names de odoo_* → mcp_odoo-mcp_odoo_*
    Afecta tanto a assistant.tool_calls[].function.name como al system prompt
    y al contenido de mensajes que referencien tools por nombre.
    """
    tool_map = manifest.get("_tool_map", {})
    prefix = RUNTIME_PREFIX

    def _rename_in_str(text: str) -> str:
        """Renombra referencias a tools dentro de texto."""
        for name in tool_map:
            runtime = f"{prefix}{name}"
            text = text.replace(f"`{name}`", f"`{runtime}`")
            text = text.replace(f'"{name}"', f'"{runtime}"')
            text = text.replace(f"'{name}'", f"'{runtime}'")
        return text

    updated = []
    for record in records:
        new_messages = []
        for msg in record.get("messages", []):
            new_msg = dict(msg)
            role = msg.get("role", "")

            # Renombrar en contenido textual
            content = new_msg.get("content")
            if isinstance(content, str):
                new_msg["content"] = _rename_in_str(content)

            # Renombrar en tool_calls
            if role == "assistant" and "tool_calls" in msg:
                new_tcs = []
                for tc in msg["tool_calls"]:
                    new_tc = dict(tc)
                    func = dict(tc.get("function", {}))
                    old_name = func.get("name", "")
                    if old_name in tool_map:
                        func["name"] = f"{prefix}{old_name}"
                    new_tc["function"] = func
                    new_tcs.append(new_tc)
                new_msg["tool_calls"] = new_tcs

            new_messages.append(new_msg)

        record["messages"] = new_messages
        updated.append(record)

    return updated


def stringify_arguments(records: list[dict]) -> list[dict]:
    """
    b) Convierte arguments de JSON object → JSON string.
    Este es el error E1 crítico: el modelo debe aprender a serializar
    arguments como string, no como objeto.
    """
    updated = []
    for record in records:
        new_messages = []
        for msg in record.get("messages", []):
            new_msg = dict(msg)
            if msg.get("role") == "assistant" and "tool_calls" in msg:
                new_tcs = []
                for tc in msg["tool_calls"]:
                    new_tc = dict(tc)
                    func = dict(tc.get("function", {}))
                    args = func.get("arguments", {})
                    if isinstance(args, dict):
                        func["arguments"] = json.dumps(args, ensure_ascii=False, sort_keys=True)
                    elif isinstance(args, str):
                        # Ya es string, validar que sea JSON válido
                        try:
                            json.loads(args)
                            func["arguments"] = args  # mantener como está
                        except json.JSONDecodeError:
                            # No es JSON válido, corregir escapando
                            func["arguments"] = json.dumps(args, ensure_ascii=False)
                    new_tc["function"] = func
                    new_tcs.append(new_tc)
                new_msg["tool_calls"] = new_tcs
            new_messages.append(new_msg)
        record["messages"] = new_messages
        updated.append(record)
    return updated


# ─────────────────────────────────────────────────────────────
# Generación de ejemplos sintéticos
# ─────────────────────────────────────────────────────────────

def _call_id(idx: int) -> str:
    return f"call_{idx}"


def _make_tool_call(tc_id: str, orig_name: str, args: dict) -> dict:
    """Crea un tool_call en formato V25."""
    return {
        "id": tc_id,
        "type": "function",
        "function": {
            "name": runtime_name(orig_name),
            "arguments": json.dumps(args, ensure_ascii=False, sort_keys=True),
        },
    }


def generate_negative_examples(manifest: dict, count: int, seed: int) -> list[dict]:
    """
    c) Genera ejemplos negativos sintéticos.

    Tres categorías:
      1. Chitchat (pregunta genérica → respuesta sin tools)
      2. Tool name no existe en manifest → rechazo
      3. Confirmación destructiva rechazada por usuario
    """
    rng = random.Random(seed + 42)
    examples = []

    tool_map = manifest.get("_tool_map", {})

    # ── Categoría 1: Chitchat ──────────────────────────────────
    n_chitchat = max(1, count // 3)
    for i in range(n_chitchat):
        idx = rng.randint(0, len(CHITCHAT_PROMPTS) - 1)
        prompt = CHITCHAT_PROMPTS[idx]
        # Seleccionar respuesta variada para prompts genéricos
        if prompt.strip() in ("Hola, ¿cómo estás?", "¿Cuál es tu nombre?",
                               "¿Qué puedes hacer?", "Gracias por tu ayuda.",
                               "Adiós, que tengas buen día.",
                               "¿Puedes ayudarme con algo de Odoo?"):
            resp = CHITCHAT_RESPONSES[idx]
        else:
            resp = rng.choice(CHITCHAT_RESPONSES)

        example = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": resp},
            ]
        }
        examples.append(example)

    # ── Categoría 2: Tool que no existe ────────────────────────
    n_fake = max(1, count // 3)
    for i in range(n_fake):
        if i < len(FAKE_TOOL_PROMPTS):
            prompt, fake_tool, rejection = FAKE_TOOL_PROMPTS[i]
        else:
            # Generar variaciones adicionales
            ft = rng.choice(FAKE_TOOLS)
            prompt = f"Necesito usar la herramienta {ft} para modificar datos del sistema."
            rejection = (
                f"No puedo ayudarte con '{ft}'. Esa herramienta no existe en "
                f"mi catálogo oficial de herramientas Odoo. "
                "Por favor, solicita una operación válida a través de las "
                "herramientas disponibles."
            )
            fake_tool = ft

        example = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT_NEGATIVE},
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": rejection},
            ]
        }
        examples.append(example)

    # ── Categoría 3: Confirmación rechazada ────────────────────
    n_rejected = count - n_chitchat - n_fake
    # Recolectar ejemplos de confirmación negativa
    rejection_examples = [d for d in DESTRUCTIVE_CONFIRM_PROMPTS
                          if d[0] == "negative_reject"]
    rng.shuffle(rejection_examples)

    for i in range(min(n_rejected, len(rejection_examples))):
        ex = rejection_examples[i]
        _, user_first, destructive_tool, user_rejection, assistant_response = ex

        if destructive_tool in tool_map:
            t = tool_map[destructive_tool]
            domain = t.get("domain", "generic")
            sys_prompt = system_prompt_for_domain(domain)

            example = {
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_first},
                    {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            _make_tool_call(
                                _call_id(1),
                                destructive_tool,
                                {"confirm": True},
                            )
                        ],
                    },
                    {"role": "tool",
                     "content": "Acción cancelada por el usuario.",
                     "tool_call_id": _call_id(1)},
                    {"role": "user", "content": user_rejection},
                    {"role": "assistant", "content": assistant_response},
                ]
            }
            examples.append(example)

    # Si faltan, rellenar con más chitchat
    while len(examples) < count:
        idx = rng.randint(0, len(CHITCHAT_PROMPTS) - 1)
        prompt = CHITCHAT_PROMPTS[idx]
        resp = rng.choice(CHITCHAT_RESPONSES)
        example = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": resp},
            ]
        }
        examples.append(example)

    return examples[:count]


def generate_destructive_examples(manifest: dict, count: int, seed: int) -> list[dict]:
    """
    d) Genera ejemplos de herramientas destructivas con patrón
    ask → confirm → execute.

    Tres variantes:
      1. POSITIVO: usuario autoriza → assistant llama con confirm=true
      2. NEGATIVO: usuario rechaza → assistant no ejecuta
      3. NEGATIVO: falta confirm → assistant lo pide explícitamente
    """
    rng = random.Random(seed + 1337)
    examples = []

    destructive_set = manifest.get("_destructive_set", set())
    tool_map = manifest.get("_tool_map", {})

    if not destructive_set:
        return examples

    destructive_list = list(destructive_set)
    domain_examples = defaultdict(list)

    for d in destructive_list:
        info = tool_map.get(d, {})
        domain_examples[info.get("domain", "generic")].append(d)

    n_positive = max(1, count // 3)
    n_negative_reject = max(1, count // 3)
    n_missing_confirm = count - n_positive - n_negative_reject

    # ── Positivos: usuario autoriza → assistant ejecuta ──────
    for i in range(n_positive):
        dt = rng.choice(destructive_list)
        info = tool_map.get(dt, {})
        domain = info.get("domain", "generic")

        # Buscar prompt positivo en plantillas si existe
        matching = [e for e in DESTRUCTIVE_CONFIRM_PROMPTS
                    if e[0] == "positive" and e[2] == dt]
        if matching:
            _, user_msg, _, _ = matching[0]
        else:
            user_msg = f"Necesito ejecutar {dt} en el sistema. Ya confirmé que es correcto, procede."

        # Tool result simulado
        tool_result = json.dumps({
            "status": "success",
            "message": f"Operación {dt} ejecutada correctamente.",
            "id": rng.randint(1000, 9999),
        }, ensure_ascii=False)

        example = {
            "messages": [
                {"role": "system", "content": system_prompt_for_domain(domain)},
                {"role": "user", "content": user_msg},
                {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        _make_tool_call(
                            _call_id(1), dt, {"confirm": True}
                        )
                    ],
                },
                {"role": "tool", "content": tool_result,
                 "tool_call_id": _call_id(1)},
                {
                    "role": "assistant",
                    "content": f"La operación **{dt}** se ha completado "
                               f"exitosamente. El sistema ha procesado la "
                               f"solicitud correctamente.",
                },
            ]
        }
        examples.append(example)

    # ── Negativos (rechazo): usuario dice "no" ───────────────
    rejection_templates = [
        ("No, mejor no hagas eso todavía.",
         "Entendido, no realizaré la operación. Avísame cuando quieras proceder."),
        ("Espera, no estoy seguro. Cancela la operación.",
         "Operación cancelada. Si más adelante decides ejecutarla, "
         "solicítalo con la confirmación explícita."),
        ("Ahora no, déjalo pendiente.",
         "De acuerdo, queda pendiente. Cuando quieras ejecutarlo, "
         "confírmalo explícitamente y lo haré."),
        ("No autorizo esa operación.",
         "Entendido, no se realiza ningún cambio en el sistema. "
         "Si cambias de opinión, estoy aquí para ayudarte."),
    ]

    for i in range(n_negative_reject):
        dt = rng.choice(destructive_list)
        info = tool_map.get(dt, {})
        domain = info.get("domain", "generic")
        reject_msg, confirm_response = rng.choice(rejection_templates)

        example = {
            "messages": [
                {"role": "system", "content": system_prompt_for_domain(domain)},
                {"role": "user",
                 "content": f"Quiero ejecutar {dt} en el sistema."},
                {
                    "role": "assistant",
                    "content": f"Para ejecutar '{dt}' necesito tu confirmación "
                               f"explícita. ¿Estás seguro de que quieres proceder? "
                               f"Esta operación modifica datos en el sistema.",
                },
                {"role": "user", "content": reject_msg},
                {"role": "assistant", "content": confirm_response},
            ]
        }
        examples.append(example)

    # ── Negativos (falta confirm): assistant pide confirmación ──
    missing_confirm_templates = [
        ("Quiero validar {tool} en el sistema.",
         "Para validar necesito confirmación explícita. ¿Confirmas que "
         "deseas ejecutar esta operación?"),
        ("Ejecuta {tool} de una vez.",
         "Antes de ejecutar, necesito que confirmes explícitamente. "
         "Es una operación que modifica datos del sistema. ¿Confirmas?"),
        ("Hazlo nomás, {tool}, dale.",
         "Necesito una confirmación explícita por seguridad. "
         "¿Estás seguro de que quieres ejecutar esta operación?"),
    ]

    for i in range(n_missing_confirm):
        dt = rng.choice(destructive_list)
        info = tool_map.get(dt, {})
        domain = info.get("domain", "generic")
        prompt_template, assistant_ask = rng.choice(missing_confirm_templates)
        user_msg = prompt_template.format(tool=dt)

        example = {
            "messages": [
                {"role": "system", "content": system_prompt_for_domain(domain)},
                {"role": "user", "content": user_msg},
                {"role": "assistant", "content": assistant_ask},
            ]
        }
        examples.append(example)

    return examples[:count]


def balance_domains(
    records: list[dict], manifest: dict, seed: int
) -> list[dict]:
    """
    e) Balancea la distribución por dominio.

    Detecta los dominios infrarrepresentados y genera ejemplos adicionales
    simples para cada uno usando herramientas del dominio.
    """
    rng = random.Random(seed + 999)
    tool_map = manifest.get("_tool_map", {})
    domain_tools = manifest.get("_domain_tools", {})

    # Contar dominio actual
    domain_count = Counter()
    for record in records:
        domains_seen = set()
        for msg in record.get("messages", []):
            if msg.get("role") == "assistant":
                for tc in msg.get("tool_calls", []):
                    name = tc.get("function", {}).get("name", "")
                    original = name.replace(RUNTIME_PREFIX, "", 1) if name.startswith(RUNTIME_PREFIX) else name
                    if original in tool_map:
                        d = tool_map[original].get("domain", "unknown")
                        domains_seen.add(d)
        for d in domains_seen:
            domain_count[d] += 1

    if not domain_count:
        return records  # Sin tools, no se puede balancear

    avg_per_domain = sum(domain_count.values()) / max(1, len(domain_count))
    threshold = avg_per_domain * 0.5

    domains_to_boost = [
        d for d in domain_tools
        if domain_count.get(d, 0) < threshold
    ]

    # Generar ejemplos simples para dominios infrarrepresentados
    suffix = 0
    new_records = list(records)

    search_templates = [
        "Necesito buscar {obj} en Odoo.",
        "¿Puedes ayudarme a encontrar {obj}?",
        "Lista los {obj} disponibles.",
        "Muéstrame todos los {obj}.",
        "Quiero consultar información de {obj}.",
    ]

    domain_objects = {
        "stock": "productos en stock",
        "sales": "órdenes de venta",
        "purchases": "órdenes de compra",
        "accounting": "facturas pendientes",
        "crm": "oportunidades de negocio",
        "hr": "empleados",
        "projects": "tareas del proyecto",
        "helpdesk": "tickets de soporte",
        "calendar": "eventos del calendario",
        "views_reports": "informes disponibles",
        "generic": "registros",
    }

    for domain in domains_to_boost:
        tools = domain_tools.get(domain, [])
        if not tools:
            continue

        # Elegir una tool de búsquisa/lectura del dominio
        search_like = [t for t in tools if any(
            kw in t for kw in ("search", "find", "get", "list", "read")
        )]
        if not search_like:
            search_like = tools[:1]

        # Generar hasta que alcance el promedio
        needed = max(0, int(avg_per_domain) - domain_count.get(domain, 0))
        needed = min(needed, 20)  # no más de 20 extra por dominio

        for _ in range(needed):
            tool_name = rng.choice(search_like)
            obj = domain_objects.get(domain, "registros")
            prompt = rng.choice(search_templates).format(obj=obj)

            # Arguments simulados
            args = {}
            if "model" in tool_name or tool_name in ("odoo_search", "odoo_read"):
                model_map = {
                    "stock": "stock.product",
                    "sales": "sale.order",
                    "purchases": "purchase.order",
                    "accounting": "account.move",
                    "crm": "crm.lead",
                    "hr": "hr.employee",
                    "projects": "project.task",
                    "helpdesk": "helpdesk.ticket",
                    "calendar": "calendar.event",
                    "views_reports": "ir.ui.view",
                    "generic": "res.partner",
                }
                args = {
                    "model": model_map.get(domain, "res.partner"),
                    "limit": 10,
                }
                if tool_name in ("odoo_search",):
                    args["domain"] = []
                elif tool_name.startswith("odoo_get_") and "summary" in tool_name:
                    args["id"] = rng.randint(1, 1000)

            tool_result = json.dumps({
                "status": "success",
                "count": rng.randint(1, 20),
                "message": f"Se encontraron resultados en {domain}.",
            }, ensure_ascii=False)

            suffix += 1
            example = {
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt_for_domain(domain),
                    },
                    {"role": "user", "content": prompt},
                    {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            _make_tool_call(
                                _call_id(suffix), tool_name, args
                            )
                        ],
                    },
                    {
                        "role": "tool", "content": tool_result,
                        "tool_call_id": _call_id(suffix),
                    },
                    {
                        "role": "assistant",
                        "content": f"Estos son los {obj} que he encontrado "
                                   f"en el sistema.",
                    },
                ]
            }
            new_records.append(example)

    return new_records


# ─────────────────────────────────────────────────────────────
# Pipeline principal
# ─────────────────────────────────────────────────────────────

def transform_pipeline(args: argparse.Namespace) -> None:
    """Ejecuta el pipeline completo de transformación."""
    if args.verbose:
        print(f"[INFO] Cargando manifest: {args.manifest}")
        print(f"[INFO] Cargando dataset V24: {args.input}")

    # 1. Cargar manifest
    manifest = load_manifest(args.manifest)
    if args.verbose:
        print(f"[INFO] Manifest: {manifest.get('total_tools')} herramientas, "
              f"{len(manifest['_destructive_set'])} destructivas")

    # 2. Cargar dataset
    records = load_dataset(args.input)
    if args.verbose:
        print(f"[INFO] Dataset V24: {len(records)} ejemplos")

    # 3a. Renombrar tool_names
    records = rename_tool_names(records, manifest)
    if args.verbose:
        print(f"[INFO] Transformación a) rename_tool_names completada")

    # 3b. Stringificar arguments
    records = stringify_arguments(records)
    if args.verbose:
        print(f"[INFO] Transformación b) stringify_arguments completada")

    # 3c. Generar ejemplos negativos
    n_negative = max(1, int(len(records) * args.negative_ratio))
    negative_examples = generate_negative_examples(
        manifest, n_negative, args.seed
    )
    records.extend(negative_examples)
    if args.verbose:
        print(f"[INFO] Transformación c) generados {len(negative_examples)} "
              f"ejemplos negativos (~{args.negative_ratio:.0%})")

    # 3d. Generar ejemplos destructivos
    n_destructive = max(1, int(len(records) * args.destructive_ratio))
    destructive_examples = generate_destructive_examples(
        manifest, n_destructive, args.seed
    )
    records.extend(destructive_examples)
    if args.verbose:
        print(f"[INFO] Transformación d) generados "
              f"{len(destructive_examples)} ejemplos destructivos "
              f"(~{args.destructive_ratio:.0%})")

    # 3e. Balancear dominios
    records = balance_domains(records, manifest, args.seed)
    if args.verbose:
        print(f"[INFO] Transformación e) balanceo de dominios completado")

    # 4. Validar
    if args.verbose:
        print(f"[INFO] Validando dataset ({len(records)} ejemplos)...")

    validation = validate_dataset(records, manifest, args.verbose)
    if args.verbose:
        print(f"[INFO] Validación: {'PASÓ ✓' if validation['valid'] else 'FALLÓ ✗'}")
        print(f"       Total: {validation['total']}")
        print(f"       Errores: {len(validation['errors'])}")
        print(f"       Warnings: {len(validation['warnings'])}")
        print(f"       Negativos: {validation['negative_count']}")
        print(f"       Destructivos: {validation['destructive_count']}")
        if validation['domain_distribution']:
            print(f"       Dominios: {dict(validation['domain_distribution'])}")

    if not validation["valid"]:
        for err in validation["errors"][:10]:
            print(f"[ERROR] {err}", file=sys.stderr)
        if len(validation["errors"]) > 10:
            print(f"[ERROR] ... y {len(validation['errors']) - 10} más",
                  file=sys.stderr)
        if not args.force:
            print("[FATAL] Dataset inválido. Usa --force para escribir "
                  "de todas formas.", file=sys.stderr)
            sys.exit(1)

    # 5. Split train/val
    rng_split = random.Random(args.seed)
    indices = list(range(len(records)))
    rng_split.shuffle(indices)

    n_val = max(1, int(len(records) * args.val_split))
    val_indices = set(indices[:n_val])
    train_records = [records[i] for i in indices if i not in val_indices]
    val_records = [records[i] for i in indices if i in val_indices]

    # 6. Escribir output
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    if args.output != args.val_output:
        os.makedirs(os.path.dirname(args.val_output) or ".", exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as f:
        for rec in train_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    with open(args.val_output, "w", encoding="utf-8") as f:
        for rec in val_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    if args.verbose:
        print(f"[INFO] Train escrito: {args.output} "
              f"({len(train_records)} ejemplos)")
        print(f"[INFO] Val escrito: {args.val_output} "
              f"({len(val_records)} ejemplos)")
        print(f"[INFO] Total: {len(train_records) + len(val_records)} ejemplos")


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────

def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="fix_dataset_v25.py — Transformador de dataset V24 a V25",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Ejemplo:\n"
            "  python fix_dataset_v25.py --input v24_train.jsonl \\\n"
            "    --output v25_train.jsonl --val-output v25_val.jsonl \\\n"
            "    --manifest odooclaw_tool_manifest.json --verbose\n"
        ),
    )

    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path al dataset V24 (JSONL, formato OpenAI tool_calls)",
    )
    parser.add_argument(
        "--output", "-o",
        default="v25_train.jsonl",
        help="Path de salida para train V25 (default: v25_train.jsonl)",
    )
    parser.add_argument(
        "--val-output", "-v",
        default="v25_val.jsonl",
        help="Path de salida para validation V25 (default: v25_val.jsonl)",
    )
    parser.add_argument(
        "--manifest", "-m",
        required=True,
        help="Path al manifest OdooClaw (odooclaw_tool_manifest.json)",
    )
    parser.add_argument(
        "--negative-ratio",
        type=float,
        default=0.09,
        help="Proporción de ejemplos negativos a añadir (default: 0.09)",
    )
    parser.add_argument(
        "--destructive-ratio",
        type=float,
        default=0.05,
        help="Proporción de ejemplos destructivos a añadir (default: 0.05)",
    )
    parser.add_argument(
        "--val-split",
        type=float,
        default=0.1,
        help="Proporción para validation split (default: 0.1)",
    )
    parser.add_argument(
        "--verbose", "-V",
        action="store_true",
        default=False,
        help="Modo verbose con información detallada",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Semilla para generación sintética y splits (default: 42)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        default=False,
        help="Escribir output incluso si la validación falla",
    )

    parsed = parser.parse_args(argv)

    # Validar rangos
    if not 0.0 <= parsed.negative_ratio <= 1.0:
        parser.error("--negative-ratio debe estar entre 0 y 1")
    if not 0.0 <= parsed.destructive_ratio <= 1.0:
        parser.error("--destructive-ratio debe estar entre 0 y 1")
    if not 0.0 < parsed.val_split < 1.0:
        parser.error("--val-split debe estar entre 0 y 1 (exclusivo)")

    return parsed


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()
    transform_pipeline(args)


if __name__ == "__main__":
    main()
