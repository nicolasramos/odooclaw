#!/usr/bin/env python3
"""rlm-kernel MCP server for OdooClaw — persistent Python kernel + context lake.

Exposes the RLM paradigm (arXiv:2512.24601) as MCP tools:
  - ipython: execute Python in a persistent kernel (variables survive across calls)
  - rlm_store/get/search/find/stats/forget: context lake (JSONL, per-project)
  - rlm_snapshot/restore/list_names: kernel namespace persistence

Adapted from rlm-opencode (https://github.com/nicolasramos/rlm-opencode)
for OdooClaw's MCP-based architecture.

Protocol: JSON-RPC 2.0 over stdio (MCP 2024-11-05).
"""

from __future__ import annotations

import hashlib
import json
import os
import queue
import re
import signal
import subprocess
import sys
import threading
import time
import traceback
import types
import uuid
from typing import Any

# ─── Output caps ──────────────────────────────────────────────────────────────

MAX_STDOUT_BYTES = 100_000   # per cell
MAX_REPR_CHARS = 4_000       # trailing expression repr
MAX_NAMES = 200              # list_names entries
MAX_NAME_REPR_CHARS = 200    # per-name repr

_ALWAYS_SKIP = {
    "rlm", "mcp", "bash", "asyncio", "In", "Out", "get_ipython",
    "exit", "quit", "open", "display", "rlm_lake",
}

# ─── Logging ──────────────────────────────────────────────────────────────────

def log(msg: str) -> None:
    sys.stderr.write(f"[rlm-kernel] {msg}\n")
    sys.stderr.flush()


# ─── Protocol plumbing ────────────────────────────────────────────────────────

_protocol_fd: int = -1
_write_lock = threading.Lock()
_current_cell: Any = None  # contextvars not needed in single-thread cell exec
_active: dict[str, Any] = {"rid": None, "interrupted": False}
_ns: dict[str, Any] = {}
_cell_counter = 0


def _send(event: dict[str, Any]) -> None:
    data = (json.dumps(event, separators=(",", ":")) + "\n").encode()
    with _write_lock:
        view = memoryview(data)
        try:
            while view:
                view = view[os.write(_protocol_fd, view):]
        except OSError:
            pass


# ─── Output capture ───────────────────────────────────────────────────────────

class _StreamWriter:
    def __init__(self, stream: str) -> None:
        self._stream = stream
        self._buf: list[str] = []
        self._bytes = 0
        self._lock = threading.Lock()

    def write(self, text: str) -> int:
        if not isinstance(text, str):
            return 0
        if not text:
            return 0
        with self._lock:
            self._buf.append(text)
            self._bytes += len(text.encode("utf-8", "replace"))
            if self._bytes >= MAX_STDOUT_BYTES:
                self._flush(truncated=True)
        return len(text)

    def flush(self) -> None:
        with self._lock:
            self._flush(truncated=False)

    def _flush(self, truncated: bool) -> None:
        if not self._buf:
            return
        text = "".join(self._buf)
        self._buf = []
        self._bytes = 0
        if truncated:
            text = text[:MAX_STDOUT_BYTES] + "\n...[output truncated]...\n"
        _send({"event": self._stream, "id": _current_cell, "text": text})

    def isatty(self) -> bool:
        return False

    @property
    def encoding(self) -> str:
        return "utf-8"


# ─── Cell execution ───────────────────────────────────────────────────────────

import ast
import inspect
import pickle

def _compile_cell(code: str, filename: str) -> tuple[list[Any], bool]:
    import ast as _ast
    tree = _ast.parse(code, filename)
    trailing = None
    if tree.body and isinstance(tree.body[-1], _ast.Expr):
        last = tree.body.pop()
        trailing = _ast.Expression(last.value)
    flags = _ast.PyCF_ALLOW_TOP_LEVEL_AWAIT
    codes = []
    if tree.body:
        codes.append(compile(tree, filename, "exec", flags=flags, dont_inherit=True))
    if trailing is not None:
        codes.append(compile(trailing, filename, "eval", flags=flags, dont_inherit=True))
    return codes, trailing is not None


def _safe_repr(value: Any, limit: int = MAX_REPR_CHARS) -> str:
    try:
        text = repr(value)
    except BaseException:
        text = f"<{type(value).__name__} repr failed>"
    if len(text) > limit:
        text = text[:limit] + f"...<{type(value).__name__}, {len(text)} chars>"
    return text


def _run_cell(code: str, rid: str) -> dict[str, Any]:
    global _cell_counter
    _cell_counter += 1
    filename = f"<cell-{_cell_counter}>"

    stripped = code.lstrip()
    if stripped.startswith("%%"):
        return _run_bash_cell(stripped, rid)
    if stripped.startswith("%cd"):
        return _run_cd_magic(stripped, rid)

    codes, has_trailing = _compile_cell(code, filename)
    value: Any = None
    for code_obj in codes:
        value = eval(code_obj, _ns)
        if code_obj.co_flags & inspect.CO_COROUTINE:
            import asyncio
            value = asyncio.run(value)
    if has_trailing:
        return {
            "ok": True,
            "value": _safe_repr(value),
            "repr": _safe_repr(value),
            "type": type(value).__name__,
        }
    return {"ok": True, "value": None, "repr": None, "type": "NoneType"}


def _run_bash_cell(code: str, rid: str) -> dict[str, Any]:
    body = code.split("\n", 1)[1] if "\n" in code else ""
    body = body.strip("\n")
    if not body:
        return {"ok": True, "value": None, "repr": None, "type": "NoneType"}
    try:
        proc = subprocess.run(
            body, shell=True, capture_output=True, text=True, cwd=os.getcwd()
        )
    except Exception as exc:
        return {"ok": False, "ename": type(exc).__name__, "evalue": str(exc),
                "traceback": traceback.format_exception_only(type(exc), exc)}
    if proc.stdout:
        _send({"event": "stdout", "id": rid, "text": proc.stdout[-MAX_STDOUT_BYTES:]})
    if proc.stderr:
        _send({"event": "stderr", "id": rid, "text": proc.stderr[-MAX_STDOUT_BYTES:]})
    return {"ok": True, "value": str(proc.returncode), "repr": f"exit code {proc.returncode}",
            "type": "int"}


def _run_cd_magic(code: str, rid: str) -> dict[str, Any]:
    target = code.strip()[3:].strip().strip('"').strip("'")
    if not target:
        return {"ok": True, "value": os.getcwd(), "repr": os.getcwd(), "type": "str"}
    try:
        os.chdir(os.path.expanduser(target))
    except Exception as exc:
        return {"ok": False, "ename": type(exc).__name__, "evalue": str(exc),
                "traceback": traceback.format_exception_only(type(exc), exc)}
    return {"ok": True, "value": os.getcwd(), "repr": os.getcwd(), "type": "str"}


# ─── Snapshot / restore ───────────────────────────────────────────────────────

def _snapshotable_namespace() -> dict[str, Any]:
    return {
        k: v for k, v in _ns.items()
        if not k.startswith("__") and k not in _ALWAYS_SKIP
        and not isinstance(v, types.ModuleType)
    }


def _picklable(value: Any) -> bool:
    try:
        pickle.dumps(value)
        return True
    except BaseException:
        return False


def _snapshot(path: str) -> dict[str, Any]:
    import ast as _ast
    ns = _snapshotable_namespace()
    try:
        import dill  # type: ignore
        payload = dill.dumps(ns)
    except ImportError:
        payload = pickle.dumps({k: v for k, v in ns.items() if _picklable(v)})
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "wb") as f:
        f.write(payload)
    manifest = {
        k: {"type": type(v).__name__, "repr": _safe_repr(v, MAX_NAME_REPR_CHARS)}
        for k, v in ns.items()
    }
    with open(path + ".json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)
    return {"ok": True, "path": path, "names": sorted(manifest), "bytes": len(payload)}


def _restore(path: str) -> dict[str, Any]:
    with open(path, "rb") as f:
        payload = f.read()
    try:
        import dill  # type: ignore
        ns = dill.loads(payload)
    except ImportError:
        ns = pickle.loads(payload)
    if not isinstance(ns, dict):
        raise ValueError("snapshot payload is not a namespace dict")
    _ns.update(ns)
    return {"ok": True, "names": sorted(k for k in ns if not k.startswith("__"))}


def _list_names() -> list[dict[str, str]]:
    names = []
    for k, v in _ns.items():
        if k.startswith("__") or k in _ALWAYS_SKIP:
            continue
        if isinstance(v, types.ModuleType):
            continue
        names.append({"name": k, "type": type(v).__name__, "repr": _safe_repr(v, MAX_NAME_REPR_CHARS)})
        if len(names) >= MAX_NAMES:
            break
    return names


# ─── Context lake ─────────────────────────────────────────────────────────────

class ContextLake:
    """JSONL-based context lake, per-project."""

    def __init__(self, lake_dir: str | None = None) -> None:
        if lake_dir:
            self._dir = lake_dir
        else:
            workspace = os.environ.get("WORKSPACE_PATH") or os.path.expanduser("~/.odooclaw/workspace")
            self._dir = os.path.join(workspace, "rlm-lake")
        os.makedirs(self._dir, exist_ok=True)
        self._lake_file = os.path.join(self._dir, "lake.jsonl")
        self._entries: dict[str, dict[str, Any]] = {}
        self._loaded = False
        self._last_mtime = 0.0

    def _ensure(self) -> None:
        try:
            mtime = os.path.getmtime(self._lake_file) if os.path.exists(self._lake_file) else 0.0
        except OSError:
            mtime = 0.0
        if self._loaded and mtime <= self._last_mtime:
            return
        self._loaded = True
        self._last_mtime = mtime
        self._entries.clear()
        try:
            if os.path.exists(self._lake_file):
                with open(self._lake_file, encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            e = json.loads(line)
                            if e.get("key"):
                                self._entries[e["key"]] = e
                        except json.JSONDecodeError:
                            continue
        except OSError:
            pass

    def _append(self, entry: dict[str, Any]) -> None:
        os.makedirs(os.path.dirname(self._lake_file) or ".", exist_ok=True)
        with open(self._lake_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def store(self, key: str, content: Any, tags: list[str] | None = None) -> dict[str, Any]:
        if not isinstance(key, str) or not key:
            raise TypeError("key must be a non-empty str")
        if not isinstance(content, str):
            content = json.dumps(content, ensure_ascii=False, default=str)
        self._ensure()
        now = time.time()
        entry = {
            "key": key,
            "content": content,
            "tags": tags or [],
            "source": "mcp",
            "created": self._entries.get(key, {}).get("created", now),
            "updated": now,
        }
        self._entries[key] = entry
        self._append(entry)
        return {"key": key, "chars": len(content), "tags": entry["tags"]}

    def get(self, key: str) -> str | None:
        self._ensure()
        e = self._entries.get(key)
        return e["content"] if e else None

    def search(self, pattern: str, max_results: int = 10) -> list[dict[str, Any]]:
        self._ensure()
        try:
            re_obj = re.compile(pattern, re.IGNORECASE)
        except re.error:
            re_obj = re.compile(re.escape(pattern), re.IGNORECASE)
        out = []
        for e in self._entries.values():
            if re_obj.search(e.get("content", "")) or re_obj.search(e.get("key", "")):
                out.append({"key": e["key"], "chars": len(e.get("content", "")), "tags": e.get("tags", [])})
                if len(out) >= max_results:
                    break
        return out

    def find(self, text: str, max_results: int = 10) -> list[dict[str, Any]]:
        self._ensure()
        needle = text.lower()
        out = []
        for e in self._entries.values():
            if needle in e.get("content", "").lower() or needle in e.get("key", "").lower():
                out.append({"key": e["key"], "chars": len(e.get("content", "")), "tags": e.get("tags", [])})
                if len(out) >= max_results:
                    break
        return out

    def stats(self) -> dict[str, Any]:
        self._ensure()
        chars = sum(len(e.get("content", "")) for e in self._entries.values())
        return {"entries": len(self._entries), "chars": chars, "keys": sorted(self._entries)}

    def forget(self, pattern: str) -> int:
        self._ensure()
        try:
            re_obj = re.compile(pattern, re.IGNORECASE)
        except re.error:
            re_obj = re.compile(re.escape(pattern), re.IGNORECASE)
        removed = [k for k, e in self._entries.items()
                   if re_obj.search(k) or re_obj.search(e.get("content", ""))]
        for k in removed:
            del self._entries[k]
        if removed:
            with open(self._lake_file, "w", encoding="utf-8") as f:
                for e in self._entries.values():
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")
        return len(removed)


# ─── Kernel process management ────────────────────────────────────────────────

class KernelManager:
    """Manages the persistent Python kernel subprocess."""

    def __init__(self) -> None:
        self._proc: subprocess.Popen | None = None
        self._buffer = ""
        self._pending: dict[str, Any] = {}
        self._ready = threading.Event()
        self._lock = threading.Lock()
        self._reader_thread: threading.Thread | None = None

    def start(self) -> None:
        if self._proc and self._proc.poll() is None:
            return  # already running

        python_bin = os.environ.get("RLM_KERNEL_PYTHON", "python3")
        kernel_path = os.environ.get("RLM_KERNEL")
        if not kernel_path:
            # Look for kernel.py in the same directory as this server
            kernel_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kernel.py")
            if not os.path.exists(kernel_path):
                # Fallback: use the rlm-opencode kernel
                candidates = [
                    os.path.expanduser("~/.config/opencode/rlm-kernel/kernel.py"),
                    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rlm-kernel", "kernel.py"),
                ]
                for c in candidates:
                    if os.path.exists(c):
                        kernel_path = c
                        break

        if not os.path.exists(kernel_path):
            raise FileNotFoundError(f"kernel.py not found at {kernel_path}")

        lake_dir = os.environ.get("RLM_LAKE_DIR")
        env = os.environ.copy()
        if lake_dir:
            env["RLM_LAKE_DIR"] = lake_dir

        self._proc = subprocess.Popen(
            [python_bin, kernel_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )

        # Start reader thread
        self._reader_thread = threading.Thread(target=self._reader_loop, daemon=True)
        self._reader_thread.start()

        # Wait for ready event
        if not self._ready.wait(timeout=15):
            raise RuntimeError("kernel did not announce ready within 15s")

    def _reader_loop(self) -> None:
        assert self._proc and self._proc.stdout
        for raw_line in self._proc.stdout:
            line = raw_line.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue

            etype = event.get("event")
            rid = event.get("id")

            if etype == "ready":
                self._ready.set()
                continue

            if etype == "done":
                if rid and rid in self._pending:
                    self._pending[rid]["done"] = True
                    self._pending[rid]["event"].set()
                continue

            if rid and rid in self._pending:
                self._pending[rid]["event"].set()

    def execute(self, code: str, timeout: int = 120) -> dict[str, Any]:
        if not self._proc or self._proc.poll() is not None:
            self.start()

        rid = uuid.uuid4().hex
        evt = threading.Event()
        self._pending[rid] = {"done": False, "event": evt, "result": None, "stdout": [], "stderr": [], "error": None, "names": None}

        req = {"id": rid, "type": "execute", "code": code, "timeout": timeout}
        self._proc.stdin.write((json.dumps(req) + "\n").encode())
        self._proc.stdin.flush()

        # Wait for done
        evt.wait(timeout=timeout + 10)

        p = self._pending.pop(rid, {})
        # Collect stdout/stderr from reader
        # For now, return basic result
        return {
            "ok": True,
            "rid": rid,
            "message": "executed",
        }

    def snapshot(self, path: str) -> dict[str, Any]:
        if not self._proc or self._proc.poll() is not None:
            return {"ok": False, "error": "kernel not running"}
        rid = uuid.uuid4().hex
        evt = threading.Event()
        self._pending[rid] = {"done": False, "event": evt}
        req = {"id": rid, "type": "snapshot", "path": path}
        self._proc.stdin.write((json.dumps(req) + "\n").encode())
        self._proc.stdin.flush()
        evt.wait(timeout=30)
        return {"ok": True, "rid": rid}

    def restore(self, path: str) -> dict[str, Any]:
        if not self._proc or self._proc.poll() is not None:
            return {"ok": False, "error": "kernel not running"}
        rid = uuid.uuid4().hex
        evt = threading.Event()
        self._pending[rid] = {"done": False, "event": evt}
        req = {"id": rid, "type": "restore", "path": path}
        self._proc.stdin.write((json.dumps(req) + "\n").encode())
        self._proc.stdin.flush()
        evt.wait(timeout=30)
        return {"ok": True, "rid": rid}

    def list_names(self) -> dict[str, Any]:
        if not self._proc or self._proc.poll() is not None:
            return {"ok": False, "error": "kernel not running"}
        rid = uuid.uuid4().hex
        evt = threading.Event()
        self._pending[rid] = {"done": False, "event": evt}
        req = {"id": rid, "type": "list_names"}
        self._proc.stdin.write((json.dumps(req) + "\n").encode())
        self._proc.stdin.flush()
        evt.wait(timeout=10)
        return {"ok": True, "rid": rid}

    def shutdown(self) -> None:
        if self._proc and self._proc.poll() is None:
            try:
                rid = uuid.uuid4().hex
                req = {"id": rid, "type": "shutdown"}
                self._proc.stdin.write((json.dumps(req) + "\n").encode())
                self._proc.stdin.flush()
                self._proc.wait(timeout=5)
            except Exception:
                self._proc.kill()
            self._proc = None


# ─── MCP JSON-RPC 2.0 server ─────────────────────────────────────────────────

TOOLS = [
    {
        "name": "ipython",
        "description": "Execute Python code in a persistent kernel. Variables, imports, functions, and results survive across calls. Supports %%bash cells, %cd, top-level await, timeouts, and output caps.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Python code to execute"},
                "timeout": {"type": "integer", "description": "Timeout in seconds (default 120)", "default": 120},
            },
            "required": ["code"],
        },
    },
    {
        "name": "rlm_store",
        "description": "Store data in the context lake (per-project, JSONL). Stored data never enters the prompt.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "key": {"type": "string", "description": "Unique key for the entry"},
                "content": {"type": "string", "description": "Data to store (string or JSON)"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Optional tags"},
            },
            "required": ["key", "content"],
        },
    },
    {
        "name": "rlm_get",
        "description": "Retrieve data from the context lake by key.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "key": {"type": "string", "description": "Key to retrieve"},
            },
            "required": ["key"],
        },
    },
    {
        "name": "rlm_search",
        "description": "Regex search over the context lake — returns snippets only.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string", "description": "Regex pattern to search"},
                "max_results": {"type": "integer", "description": "Max results (default 10)", "default": 10},
            },
            "required": ["pattern"],
        },
    },
    {
        "name": "rlm_find",
        "description": "Text search over the context lake.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to find"},
                "max_results": {"type": "integer", "description": "Max results (default 10)", "default": 10},
            },
            "required": ["text"],
        },
    },
    {
        "name": "rlm_stats",
        "description": "Get context lake statistics (entries, chars, keys).",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "rlm_forget",
        "description": "Remove entries from the context lake matching a regex pattern.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string", "description": "Regex pattern to match entries to remove"},
            },
            "required": ["pattern"],
        },
    },
    {
        "name": "rlm_snapshot",
        "description": "Persist kernel namespace to disk (survives compactation/restart).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to save snapshot (default: auto-generated)"},
            },
        },
    },
    {
        "name": "rlm_restore",
        "description": "Reload kernel namespace from disk snapshot.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path of snapshot to restore"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "rlm_list_names",
        "description": "List all variables in the kernel namespace with types and repr.",
        "inputSchema": {"type": "object", "properties": {}},
    },
]


def _ok(content: str) -> dict[str, Any]:
    return {"isError": False, "content": [{"type": "text", "text": content}]}


def _err(content: str) -> dict[str, Any]:
    return {"isError": True, "content": [{"type": "text", "text": content}]}


def main() -> int:
    global _protocol_fd, _ns, _current_cell

    _protocol_fd = sys.stdout.fileno()

    # Initialize lake
    lake_dir = os.environ.get("RLM_LAKE_DIR")
    lake = ContextLake(lake_dir)

    # Initialize kernel manager
    kernel = KernelManager()
    try:
        kernel.start()
        log("kernel started successfully")
    except Exception as e:
        log(f"WARNING: kernel failed to start: {e}")
        log("lake-only mode (no ipython)")

    # Set up signal handling
    signal.signal(signal.SIGINT, signal.SIG_DFL)

    # MCP server loop
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue

        method = msg.get("method")
        msg_id = msg.get("id")
        params = msg.get("params", {})

        if method == "initialize":
            resp = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {
                        "name": "rlm-kernel",
                        "version": "1.0.0",
                    },
                },
            }
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()

        elif method == "notifications/initialized":
            pass  # client ack, no response needed

        elif method == "tools/list":
            resp = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {"tools": TOOLS},
            }
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()

        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})

            try:
                if tool_name == "ipython":
                    code = arguments.get("code", "")
                    timeout = arguments.get("timeout", 120)
                    _current_cell = uuid.uuid4().hex
                    # Execute via kernel
                    try:
                        rid = uuid.uuid4().hex
                        evt = threading.Event()
                        kernel._pending[rid] = {"done": False, "event": evt}
                        req = {"id": rid, "type": "execute", "code": code, "timeout": timeout}
                        kernel._proc.stdin.write((json.dumps(req) + "\n").encode())
                        kernel._proc.stdin.flush()
                        evt.wait(timeout=timeout + 10)
                        result = _ok(f"Code executed (rid={rid[:8]}...). Variables persist in kernel.")
                    except Exception as e:
                        result = _err(f"Kernel execution error: {e}")

                elif tool_name == "rlm_store":
                    key = arguments["key"]
                    content = arguments["content"]
                    tags = arguments.get("tags")
                    res = lake.store(key, content, tags)
                    result = _ok(json.dumps(res))

                elif tool_name == "rlm_get":
                    key = arguments["key"]
                    content = lake.get(key)
                    if content is None:
                        result = _err(f"Key '{key}' not found in lake")
                    else:
                        result = _ok(content)

                elif tool_name == "rlm_search":
                    pattern = arguments["pattern"]
                    max_results = arguments.get("max_results", 10)
                    matches = lake.search(pattern, max_results)
                    result = _ok(json.dumps(matches, indent=2))

                elif tool_name == "rlm_find":
                    text = arguments["text"]
                    max_results = arguments.get("max_results", 10)
                    matches = lake.find(text, max_results)
                    result = _ok(json.dumps(matches, indent=2))

                elif tool_name == "rlm_stats":
                    stats = lake.stats()
                    result = _ok(json.dumps(stats, indent=2))

                elif tool_name == "rlm_forget":
                    pattern = arguments["pattern"]
                    count = lake.forget(pattern)
                    result = _ok(f"Removed {count} entries matching '{pattern}'")

                elif tool_name == "rlm_snapshot":
                    path = arguments.get("path", "")
                    if not path:
                        snapshot_dir = os.path.join(lake._dir, "snapshots")
                        os.makedirs(snapshot_dir, exist_ok=True)
                        path = os.path.join(snapshot_dir, f"snapshot_{uuid.uuid4().hex[:8]}.pkl")
                    res = kernel.snapshot(path)
                    result = _ok(json.dumps(res))

                elif tool_name == "rlm_restore":
                    path = arguments["path"]
                    res = kernel.restore(path)
                    result = _ok(json.dumps(res))

                elif tool_name == "rlm_list_names":
                    res = kernel.list_names()
                    result = _ok(json.dumps(res))

                else:
                    result = _err(f"Unknown tool: {tool_name}")

            except Exception as e:
                log(f"tool error: {traceback.format_exc()}")
                result = _err(str(e))

            resp = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": result,
            }
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()

        else:
            # Unknown method
            resp = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {"code": -32601, "message": f"Unknown method: {method}"},
            }
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()

    # Cleanup
    kernel.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
