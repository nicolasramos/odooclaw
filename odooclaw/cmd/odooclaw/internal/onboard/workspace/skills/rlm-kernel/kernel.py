#!/usr/bin/env python3
"""rlm-kernel — persistent Python REPL runtime for the OpenCode RLM plugin.

A self-contained CPython REPL that speaks newline-delimited JSON over stdio.
One persistent namespace; variables, imports, functions and results survive
across execute requests. Supports top-level await, ``%%bash`` cells, ``%cd``,
per-cell stdout/stderr capture, snapshot/restore, interrupts and timeouts.

This is the "kernel" half of the RLM (recursive language model) programming
model (arXiv:2512.24601): the model keeps working state in a durable Python
control environment instead of re-reading files or re-sending data through
the LLM context on every turn.

Protocol (one JSON object per line):

  Request -> {"id": "...", "type": "execute", "code": "...", "timeout": 120}
  Events  -> {"event": "stdout"|"stderr", "id": "...", "text": "..."}   (0..n)
             {"event": "result", "id": "...", "ok": true, "value": "...",
              "repr": "...", "type": "..."}
          |  {"event": "error", "id": "...", "ename": "...", "evalue": "...",
              "traceback": [...]}
             {"event": "done", "id": "..."}

  Request -> {"id": "...", "type": "interrupt"}
  Events  -> error (KeyboardInterrupt) then done

  Request -> {"id": "...", "type": "snapshot", "path": "/abs/state.pkl"}
  Events  -> result {ok, path, names, bytes} | error, then done

  Request -> {"id": "...", "type": "restore", "path": "/abs/state.pkl"}
  Events  -> result {ok, names} | error, then done

  Request -> {"id": "...", "type": "list_names"}
  Events  -> {"event": "names", "id": "...", "names": [{name,type,repr}, ...]}
             then done

  Request -> {"id": "...", "type": "shutdown"}
  Events  -> done, then process exits 0.

Output caps keep the model context lean: stdout is capped per cell and the
trailing-expression repr is truncated. The model can query specific values
with later cells instead of receiving everything.
"""

from __future__ import annotations

import ast
import asyncio
import contextvars
import inspect
import json
import os
import pickle
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

PROTOCOL_VERSION = 1

# ─── Output caps ("no saturar" the model) ────────────────────────────────────
MAX_STDOUT_BYTES = 100_000   # per cell, per stream
MAX_REPR_CHARS = 4_000       # trailing expression repr
MAX_NAMES = 200              # list_names entries
MAX_NAME_REPR_CHARS = 200    # per-name repr in list_names

# Names the bootstrap re-creates on every start; never snapshotted/listed.
_ALWAYS_SKIP = {
    "rlm", "mcp", "bash", "asyncio", "In", "Out", "get_ipython",
    "exit", "quit", "open", "display", "rlm_lake",
}

# ─── Protocol plumbing ────────────────────────────────────────────────────────

_protocol_fd: int = -1
_write_lock = threading.Lock()
_current_cell: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "_current_cell", default=None
)
_active: dict[str, Any] = {"rid": None, "interrupted": False}
_ns: dict[str, Any] = {}                   # the persistent user namespace
_cell_counter = 0


def _send(event: dict[str, Any]) -> None:
    """Write one protocol frame; the locked single write keeps frames atomic."""
    data = (json.dumps(event, separators=(",", ":")) + "\n").encode()
    with _write_lock:
        view = memoryview(data)
        try:
            while view:
                view = view[os.write(_protocol_fd, view):]
        except OSError:
            pass


def emit(data: dict[str, Any]) -> None:
    """Ship one display event (dict of MIME type -> JSON payload)."""
    if not isinstance(data, dict) or not data or not all(isinstance(k, str) for k in data):
        raise TypeError("emit() requires a non-empty dict keyed by MIME type strings")
    json.dumps(data, allow_nan=False)  # validate before any bytes are written
    _send({"event": "display", "id": _current_cell.get(), "data": data})


# ─── Output capture ───────────────────────────────────────────────────────────

class _StreamWriter:
    """sys.stdout/sys.stderr replacement that ships text as protocol events.

    Writes are attributed to the cell running at write time via the
    _current_cell contextvar. Thread-safe. Flushed after every cell.
    """

    def __init__(self, stream: str) -> None:
        self._stream = stream
        self._buf: list[str] = []
        self._bytes = 0
        self._lock = threading.Lock()

    def write(self, text: str) -> int:
        if not isinstance(text, str):
            raise TypeError(f"write() argument must be str, not {type(text).__name__}")
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
            # Keep only the head of the output; drop the rest so a single
            # huge write cannot flood the model context.
            text = text[:MAX_STDOUT_BYTES] + "\n...[output truncated]...\n"
        _send({"event": self._stream, "id": _current_cell.get(), "text": text})

    def isatty(self) -> bool:
        return False

    @property
    def encoding(self) -> str:
        return "utf-8"


# ─── Cell execution ───────────────────────────────────────────────────────────

def _compile_cell(code: str, filename: str) -> tuple[list[types.CodeType], bool]:
    """Compile a cell; a trailing expression compiles separately in eval mode."""
    tree = ast.parse(code, filename)
    trailing: ast.Expression | None = None
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last: ast.Expr = tree.body.pop()  # type: ignore[assignment]
        trailing = ast.Expression(last.value)
    flags = ast.PyCF_ALLOW_TOP_LEVEL_AWAIT
    codes: list[types.CodeType] = []
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
    """Execute one cell in the persistent namespace; returns a result dict."""
    global _cell_counter
    _cell_counter += 1
    filename = f"<cell-{_cell_counter}>"

    # Cell magics
    stripped = code.lstrip()
    if stripped.startswith("%%"):
        return _run_bash_cell(stripped, rid)
    if stripped.startswith("%cd"):
        return _run_cd_magic(stripped, rid)

    codes, has_trailing = _compile_cell(code, filename)
    value: Any = None
    for code_obj in codes:
        value = eval(code_obj, _ns)  # noqa: S307 - executing the model's cell is the runtime's job
        if code_obj.co_flags & inspect.CO_COROUTINE:
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
    """%%bash cell: run the rest of the cell as a shell command in a subshell."""
    body = code.split("\n", 1)[1] if "\n" in code else ""
    body = body.strip("\n")
    if not body:
        return {"ok": True, "value": None, "repr": None, "type": "NoneType"}
    try:
        proc = subprocess.run(
            body, shell=True, capture_output=True, text=True, cwd=os.getcwd()
        )
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "ename": type(exc).__name__, "evalue": str(exc),
                "traceback": traceback.format_exception_only(type(exc), exc)}
    if proc.stdout:
        _send({"event": "stdout", "id": rid, "text": proc.stdout[-MAX_STDOUT_BYTES:]})
    if proc.stderr:
        _send({"event": "stderr", "id": rid, "text": proc.stderr[-MAX_STDOUT_BYTES:]})
    return {"ok": True, "value": str(proc.returncode), "repr": f"exit code {proc.returncode}",
            "type": "int"}


def _run_cd_magic(code: str, rid: str) -> dict[str, Any]:
    """%cd <dir>: change the kernel's persistent working directory."""
    target = code.strip()[3:].strip().strip('"').strip("'")
    if not target:
        return {"ok": True, "value": os.getcwd(), "repr": os.getcwd(), "type": "str"}
    try:
        os.chdir(os.path.expanduser(target))
    except Exception as exc:  # noqa: BLE001
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


def _snapshot(path: str) -> dict[str, Any]:
    ns = _snapshotable_namespace()
    # Prefer dill when available (pickles more types); fall back to pickle
    # with a picklable-only filter so a single exotic object cannot kill the
    # whole snapshot.
    try:
        import dill  # type: ignore[import-not-found]
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
        import dill  # type: ignore[import-not-found]
        ns = dill.loads(payload)
    except ImportError:
        ns = pickle.loads(payload)
    if not isinstance(ns, dict):
        raise ValueError("snapshot payload is not a namespace dict")
    _ns.update(ns)
    return {"ok": True, "names": sorted(k for k in ns if not k.startswith("__"))}


def _picklable(value: Any) -> bool:
    try:
        pickle.dumps(value)
        return True
    except BaseException:
        return False


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


# ─── Context lake bridge (kernel ↔ lake, no prompt round-trip) ───────────────
# The model generates data in the kernel, then calls rlm_lake.store(key, data)
# to write it straight into the context lake file. The data never passes
# through tool arguments (which would enter the LLM prompt).

class _LakeBridge:
    """Minimal JSONL context-lake client usable from kernel cells.

    Reads RLM_LAKE_FILE (set by the plugin when spawning the kernel). All
    methods are synchronous and safe to call from any cell.
    """

    def __init__(self) -> None:
        self._file = os.environ.get("RLM_LAKE_FILE", "")
        self._entries: dict[str, dict[str, Any]] = {}
        self._loaded = False
        self._last_mtime = 0.0

    def _ensure(self) -> None:
        if not self._file:
            return
        try:
            mtime = os.path.getmtime(self._file) if os.path.exists(self._file) else 0.0
        except OSError:
            mtime = 0.0
        if self._loaded and mtime <= self._last_mtime:
            return
        self._loaded = True
        self._last_mtime = mtime
        self._entries.clear()
        try:
            if os.path.exists(self._file):
                with open(self._file, encoding="utf-8") as f:
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
        if not self._file:
            raise RuntimeError("context lake is not configured (RLM_LAKE_FILE unset)")
        os.makedirs(os.path.dirname(self._file), exist_ok=True)
        with open(self._file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def store(self, key: str, content: Any, tags: list[str] | None = None) -> dict[str, Any]:
        """Store a value (str, list, dict...) in the context lake under key."""
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
            "source": "kernel",
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
        removed = [k for k, e in self._entries.items() if re_obj.search(k) or re_obj.search(e.get("content", ""))]
        for k in removed:
            del self._entries[k]
        if removed and self._file:
            with open(self._file, "w", encoding="utf-8") as f:
                for e in self._entries.values():
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")
        return len(removed)


rlm_lake = _LakeBridge()


# ─── Interrupt / timeout ──────────────────────────────────────────────────────

def _deliver_sigint() -> None:
    """Raise KeyboardInterrupt on the main thread (where cells execute)."""
    if hasattr(signal, "pthread_kill"):
        ident = threading.main_thread().ident
        if ident is not None:
            signal.pthread_kill(ident, signal.SIGINT)


def _sigint_handler(signum: int, frame: types.FrameType | None) -> None:
    _active["interrupted"] = True
    raise KeyboardInterrupt


# ─── Request loop ─────────────────────────────────────────────────────────────

def _handle_request(req: dict[str, Any]) -> None:
    rid = req.get("id") or uuid.uuid4().hex
    rtype = req.get("type")
    _active["rid"] = rid
    _active["interrupted"] = False
    try:
        if rtype == "execute":
            code = req.get("code", "")
            timeout = req.get("timeout")
            timer = None
            if timeout and timeout > 0:
                timer = threading.Timer(timeout, _deliver_sigint)
                timer.daemon = True
                timer.start()
            try:
                result = _run_cell(code, rid)
                if result.get("ok"):
                    _send({"event": "result", "id": rid, **result})
                else:
                    _send({"event": "error", "id": rid, **result})
            except KeyboardInterrupt:
                _send({"event": "error", "id": rid, "ename": "KeyboardInterrupt",
                       "evalue": "cell interrupted", "traceback": ["KeyboardInterrupt\n"]})
            except BaseException as exc:  # noqa: BLE001
                te = traceback.TracebackException.from_exception(exc)
                _send({"event": "error", "id": rid, "ename": type(exc).__name__,
                       "evalue": _safe_str(exc), "traceback": list(te.format())})
            finally:
                if timer:
                    timer.cancel()
        elif rtype == "interrupt":
            _deliver_sigint()
        elif rtype == "snapshot":
            try:
                _send({"event": "result", "id": rid, **_snapshot(req.get("path", ""))})
            except BaseException as exc:  # noqa: BLE001
                _send({"event": "error", "id": rid, "ename": type(exc).__name__,
                       "evalue": _safe_str(exc), "traceback": []})
        elif rtype == "restore":
            try:
                _send({"event": "result", "id": rid, **_restore(req.get("path", ""))})
            except BaseException as exc:  # noqa: BLE001
                _send({"event": "error", "id": rid, "ename": type(exc).__name__,
                       "evalue": _safe_str(exc), "traceback": []})
        elif rtype == "list_names":
            _send({"event": "names", "id": rid, "names": _list_names()})
        elif rtype == "shutdown":
            _send({"event": "done", "id": rid})
            os._exit(0)
        else:
            _send({"event": "error", "id": rid, "ename": "ValueError",
                   "evalue": f"unknown request type: {rtype!r}", "traceback": []})
    finally:
        _active["rid"] = None
        sys.stdout.flush()  # type: ignore[attr-defined]
        sys.stderr.flush()  # type: ignore[attr-defined]
        _send({"event": "done", "id": rid})


def _safe_str(exc: BaseException) -> str:
    try:
        return str(exc)
    except BaseException:
        return "<exception str() failed>"


def main() -> int:
    global _protocol_fd, _ns
    _protocol_fd = sys.stdout.fileno()
    # Keep the protocol channel clean: everything the kernel prints goes
    # through _send; replace the Python-level streams with protocol writers.
    sys.stdout = _StreamWriter("stdout")  # type: ignore[assignment]
    sys.stderr = _StreamWriter("stderr")  # type: ignore[assignment]

    signal.signal(signal.SIGINT, _sigint_handler)

    _ns = {
        "__name__": "__main__",
        "__builtins__": __builtins__,
        "emit": emit,
        "rlm_lake": rlm_lake,
    }

    _send({"event": "ready", "version": PROTOCOL_VERSION})

    # Cells run on the main thread so SIGINT (delivered to the main thread)
    # interrupts the executing cell. The reader thread only enqueues.
    requests: "queue.Queue[dict[str, Any]]" = queue.Queue()

    def reader() -> None:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line)
            except json.JSONDecodeError:
                continue
            if req.get("type") == "interrupt":
                _deliver_sigint()
            else:
                requests.put(req)

    threading.Thread(target=reader, daemon=True).start()
    while True:
        req = requests.get()
        _handle_request(req)


if __name__ == "__main__":
    sys.exit(main())