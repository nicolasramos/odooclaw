import ast
from pathlib import Path


SRC_ROOT = Path(__file__).parents[1] / "src" / "odoo_mcp"
RPC_METHODS = {
    "call_kw",
    "try_call_kw",
    "model_exists",
    "field_exists",
    "get_model_fields",
    "try_get_model_fields",
}


def _parse(path: Path) -> ast.Module:
    return ast.parse(path.read_text(), filename=str(path))


def test_all_rpc_calls_propagate_sender_id():
    missing = []
    for path in SRC_ROOT.rglob("*.py"):
        # Skip macOS resource fork files (._*.py) which are binary.
        if path.name.startswith("._"):
            continue
        try:
            tree = _parse(path)
        except (UnicodeDecodeError, ValueError):
            # Skip files that can't be parsed as UTF-8 text.
            continue
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if node.func.attr not in RPC_METHODS:
                continue
            if "sender_id" not in {keyword.arg for keyword in node.keywords}:
                missing.append(f"{path.name}:{node.lineno}:{node.func.attr}")

    assert missing == [], "RPC calls bypassing delegated user context: " + ", ".join(missing)


def test_all_public_odoo_tools_accept_sender_id():
    missing = []
    for node in _parse(SRC_ROOT / "server.py").body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if not node.name.startswith("odoo_"):
            continue
        argument_names = {
            argument.arg for argument in [*node.args.args, *node.args.kwonlyargs]
        }
        if "sender_id" not in argument_names:
            missing.append(f"{node.name}:{node.lineno}")

    assert missing == [], "Public tools missing sender_id: " + ", ".join(missing)
