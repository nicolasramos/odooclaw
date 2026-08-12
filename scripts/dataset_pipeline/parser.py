#!/usr/bin/env python3
"""
MCP Tool Metadata Parser for odooclaw.

Extracts structured metadata from all MCP server sources:
  - odoo-mcp: @mcp.tool() decorated functions in server.py (~124 tools)
  - rlm-utils: build_tools() returning JSON schema dicts (2 tools)
  - ocr-invoice: build_tools() returning JSON schema dicts (2 tools)
  - edge-tts: build_tools() returning JSON schema dicts (2 tools)
  - whisper-stt: build_tools() returning JSON schema dicts (2 tools)

Total: ~134 tools across 5 servers.

Usage:
    python parser.py <repo_root> [--output metadata.json]

Output format (per tool):
    {
        "name": "odoo_search",
        "server": "odoo-mcp",
        "description": "...",
        "params": [{"name": "model", "type": "str"}, ...],
        "has_docstring": true,
        "risk_level": "read",  // read | write | destructive | mixed
        "category": "records"
    }
"""

import ast
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Server: odoo-mcp (FastMCP decorator-based)
# ---------------------------------------------------------------------------

def parse_odoo_mcp(server_py: str) -> list[dict]:
    """Parse @mcp.tool() decorated functions from odoo-mcp server.py."""
    tools = []
    with open(server_py, "r", encoding="utf-8") as f:
        source = f.read()

    tree = ast.parse(source)

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        # Check for @mcp.tool() decorator
        has_mcp_tool = False
        for dec in node.decorator_list:
            # @mcp.tool()  →  Attribute(value=Name(id='mcp'), attr='tool')
            if isinstance(dec, ast.Call):
                inner = dec.func
                if (
                    isinstance(inner, ast.Attribute)
                    and isinstance(inner.value, ast.Name)
                    and inner.value.id == "mcp"
                    and inner.attr == "tool"
                ):
                    has_mcp_tool = True
                    break
            elif isinstance(dec, ast.Attribute):
                if (
                    isinstance(dec.value, ast.Name)
                    and dec.value.id == "mcp"
                    and dec.attr == "tool"
                ):
                    has_mcp_tool = True
                    break

        if not has_mcp_tool:
            continue

        name = node.name
        docstring = ast.get_docstring(node) or ""

        # Extract parameter names and types from annotations
        params = []
        for arg in node.args.args:
            param: dict[str, Any] = {"name": arg.arg}
            if arg.annotation:
                param["type"] = ast.unparse(arg.annotation)
            params.append(param)

        # Skip sender_id — it's an internal routing param, not user-facing
        params = [p for p in params if p["name"] != "sender_id"]

        # Determine risk level
        risk = _classify_risk(name, docstring)

        # Determine category from module context
        category = _infer_category(name, source)

        tools.append({
            "name": name,
            "server": "odoo-mcp",
            "description": docstring.strip() if docstring else "",
            "has_docstring": bool(docstring),
            "params": params,
            "risk_level": risk,
            "category": category,
        })

    return tools


# ---------------------------------------------------------------------------
# Server: rlm-utils, ocr-invoice, edge-tts, whisper-stt (build_tools())
# ---------------------------------------------------------------------------

def parse_build_tools_servers(repo_root: str) -> list[dict]:
    """Parse servers that expose tools via build_tools() returning JSON dicts."""
    skills_dir = os.path.join(
        repo_root, "odooclaw", "workspace", "skills"
    )
    tools = []

    for server_name in ["rlm-utils", "ocr-invoice", "edge-tts", "whisper-stt"]:
        server_py = os.path.join(skills_dir, server_name, "server.py")
        if not os.path.exists(server_py):
            continue

        with open(server_py, "r", encoding="utf-8") as f:
            source = f.read()

        # Find build_tools() or list_tools() function and extract tool dicts
        server_tools = _extract_json_schema_tools(source, server_name)
        tools.extend(server_tools)

    return tools


def _extract_json_schema_tools(source: str, server_name: str) -> list[dict]:
    """Extract tools from build_tools() / list_tools() functions that return JSON dicts."""
    tools = []

    # Strategy: find the build_tools/list_tools function, then extract tool dicts
    # by looking for dict literals with 'name' and 'inputSchema' keys

    # Pattern 1: find build_tools/list_tools function
    func_match = re.search(
        r'def\s+(build_tools|list_tools)\s*\([^)]*\)\s*:\s*\n(\s+return\s*)',
        source,
    )

    if not func_match:
        return tools

    # Extract the return block — everything after 'return [' until matching ]
    start = func_match.end()
    # Find the opening [
    bracket_start = source.index('[', start)

    # Find matching closing bracket (handle nesting)
    depth = 0
    i = bracket_start
    while i < len(source):
        if source[i] == '[':
            depth += 1
        elif source[i] == ']':
            depth -= 1
            if depth == 0:
                break
        i += 1

    tools_block = source[bracket_start:i + 1]

    # Extract individual tool dicts by finding 'name' keys
    name_pattern = re.compile(r'"name"\s*:\s*"([^"]+)"')
    desc_pattern = re.compile(r'"description"\s*:\s*"((?:[^"\\]|\\.)*)"', re.DOTALL)
    schema_pattern = re.compile(
        r'"inputSchema"\s*:\s*(\{[^}]+\})',
        re.DOTALL,
    )

    for name_match in name_pattern.finditer(tools_block):
        tool_name = name_match.group(1)

        # Find description after this name
        desc_match = desc_pattern.search(tools_block, name_match.end())
        description = desc_match.group(1).replace('\\"', '"').replace('\\n', '\n') if desc_match else ""

        # Find schema after description
        schema_match = schema_pattern.search(tools_block, desc_match.end() if desc_match else name_match.end())
        schema_str = schema_match.group(1) if schema_match else "{}"

        # Parse the schema
        try:
            schema = json.loads(schema_str)
        except json.JSONDecodeError:
            schema = {}

        # Extract params from schema
        params = []
        props = schema.get("properties", {})
        required = schema.get("required", [])
        for pname, pinfo in props.items():
            param = {"name": pname}
            if isinstance(pinfo, dict):
                param["type"] = pinfo.get("type", "any")
                if "description" in pinfo:
                    param["description"] = pinfo["description"]
            if pname in required:
                param["required"] = True
            params.append(param)

        tools.append({
            "name": tool_name,
            "server": server_name,
            "description": description,
            "has_docstring": False,
            "params": params,
            "risk_level": _classify_json_tool(tool_name),
            "category": _infer_category_from_name(tool_name),
        })

    return tools


# ---------------------------------------------------------------------------
# Risk classification
# ---------------------------------------------------------------------------

_WRITE_KEYWORDS = {"create", "write", "post", "confirm", "register", "apply",
                   "validate", "submit", "approve", "reconcile", "post_journal",
                   "create_vendor_bill", "create_purchase", "create_sale",
                   "create_task", "create_expense", "create_lead", "create_calendar",
                   "create_activity", "create_journal_entry", "create_sale_order",
                   "create_vendor_invoice", "create_purchase_order",
                   "confirm_sale_order", "register_payment", "register_invoice_payment",
                   "apply_report_patch", "apply_view_patch", "validate_report_patch",
                   "validate_view_patch", "validate_vendor_bill",
                   "submit_expense_report", "approve_expense", "check_in", "check_out",
                   "post_chatter_message", "propose_report_patch", "propose_view_patch",
                   "visualize_report_patch", "visualize_view_patch",
                   "batch_assist_report_migration", "batch_assist_view_migration"}

_DESTRUCTIVE_KEYWORDS = {"rollback", "cancel", "delete", "remove"}


def _classify_risk(name: str, docstring: str) -> str:
    """Classify tool risk level based on name and description."""
    name_lower = name.lower()

    if any(kw in name_lower for kw in _DESTRUCTIVE_KEYWORDS):
        return "destructive"

    if any(kw in name_lower for kw in _WRITE_KEYWORDS):
        return "write"

    return "read"


def _classify_json_tool(name: str) -> str:
    """Classify risk for JSON-schema-based tools."""
    name_lower = name.lower()
    if any(kw in name_lower for kw in _DESTRUCTIVE_KEYWORDS):
        return "destructive"
    if any(kw in name_lower for kw in _WRITE_KEYWORDS):
        return "write"
    return "read"


# ---------------------------------------------------------------------------
# Category inference
# ---------------------------------------------------------------------------

def _infer_category(name: str, source: str) -> str:
    """Infer tool category from name and surrounding code context."""
    name_lower = name.lower()

    # Check which module the function is imported from in server.py
    for module in ["records", "partners", "projects", "sales", "purchases",
                   "accounting", "chatter", "generic", "introspection",
                   "actions", "business_ops"]:
        if f"from odoo_mcp.tools import" in source and module in source:
            pass  # broad check below

    # More precise: look for the function definition's context
    # Check imports in server.py to map function to module
    import_match = re.search(
        rf'from odoo_mcp\.tools import\s*\((.*?)\)',
        source, re.DOTALL
    )
    if import_match:
        imported_tools = import_match.group(1)
        # Check which module contains this function name
        for mod_match in re.finditer(
            r'(\w+),', imported_tools
        ):
            mod_name = mod_match.group(1).strip()
            # Check if the function is referenced in that module's import block
            # This is a heuristic — look for the tool name in the function body
            func_match = re.search(
                rf'def {name}\(', source
            )
            if func_match:
                # Look at the function body for module references
                func_body_start = func_match.end()
                # Find next function or end of file
                next_func = re.search(r'\n@|\ndef \w+', source[func_body_start:])
                func_body = source[func_body_start:func_body_start + (next_func.start() if next_func else 1000)]

                # Check which module's function is called
                for mod in ["records", "partners", "projects", "sales",
                           "purchases", "accounting", "chatter", "generic",
                           "introspection", "actions"]:
                    if f"{mod}." in func_body or f"odoo_mcp.tools.{mod}" in source:
                        return mod

    # Fallback: infer from name patterns
    return _infer_category_from_name(name)


def _infer_category_from_name(name: str) -> str:
    """Infer category from tool name patterns."""
    name_lower = name.lower()

    if any(kw in name_lower for kw in ["search", "read", "find", "get_", "list"]):
        return "records"
    if any(kw in name_lower for kw in ["partner", "contact"]):
        return "partners"
    if any(kw in name_lower for kw in ["task", "project"]):
        return "projects"
    if any(kw in name_lower for kw in ["sale", "order", "invoice", "purchase"]):
        return "sales"
    if any(kw in name_lower for kw in ["account", "tax", "bank", "reconcile"]):
        return "accounting"
    if any(kw in name_lower for kw in ["chatter", "activity", "post"]):
        return "chatter"
    if any(kw in name_lower for kw in ["introspect", "model", "schema"]):
        return "introspection"
    if any(kw in name_lower for kw in ["action", "invoke"]):
        return "actions"
    if any(kw in name_lower for kw in ["business", "ops"]):
        return "business_ops"

    # For non-odoo-mcp tools
    if name_lower.startswith("edge-tts"):
        return "voice"
    if name_lower.startswith("whisper"):
        return "voice"
    if name_lower.startswith("ocr"):
        return "ocr"
    if name_lower.startswith("rlm_"):
        return "rlm"

    return "general"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_all(repo_root: str) -> list[dict]:
    """Parse all MCP tools from the repository."""
    all_tools = []

    # 1. odoo-mcp server.py
    odoo_mcp_server = os.path.join(
        repo_root, "odooclaw", "workspace", "skills", "odoo-mcp", "src", "odoo_mcp", "server.py"
    )
    if os.path.exists(odoo_mcp_server):
        tools = parse_odoo_mcp(odoo_mcp_server)
        all_tools.extend(tools)
        print(f"  odoo-mcp: {len(tools)} tools parsed", file=sys.stderr)
    else:
        print(f"  WARNING: odoo-mcp server.py not found at {odoo_mcp_server}", file=sys.stderr)

    # 2. JSON-schema-based servers
    json_tools = parse_build_tools_servers(repo_root)
    all_tools.extend(json_tools)
    print(f"  JSON-schema servers: {len(json_tools)} tools parsed", file=sys.stderr)

    # Deduplicate by name
    seen = set()
    unique_tools = []
    for tool in all_tools:
        if tool["name"] not in seen:
            seen.add(tool["name"])
            unique_tools.append(tool)

    print(f"  Total unique tools: {len(unique_tools)}", file=sys.stderr)
    return unique_tools


def main():
    if len(sys.argv) < 2:
        print("Usage: parser.py <repo_root> [--output metadata.json]", file=sys.stderr)
        sys.exit(1)

    repo_root = sys.argv[1]
    output = "metadata.json"

    for arg in sys.argv[2:]:
        if arg.startswith("--output"):
            output = arg.split("=", 1)[1] if "=" in arg else "metadata.json"

    tools = parse_all(repo_root)

    # Write metadata
    os.makedirs(os.path.dirname(output) if os.path.dirname(output) else ".", exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(tools, f, indent=2, ensure_ascii=False)

    print(f"Written {len(tools)} tools to {output}", file=sys.stderr)


if __name__ == "__main__":
    main()
