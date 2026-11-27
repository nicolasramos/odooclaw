#!/usr/bin/env python3
import sys
import os
import json
import base64
import tempfile
import subprocess
import io

sys.stderr.write("[whisper-stt] Starting Whisper STT MCP server\n")
sys.stderr.flush()

try:
    import requests
except ImportError:
    sys.stderr.write("[whisper-stt] ERROR: 'requests' library not found.\n")
    sys.exit(1)


def log(msg):
    sys.stderr.write(f"[whisper-stt] {msg}\n")
    sys.stderr.flush()


class WhisperSTT:
    def __init__(self):
        self._odoo_url = os.environ.get("ODOO_URL", "").rstrip("/")
        self._odoo_db = os.environ.get("ODOO_DB", "")
        self._odoo_user = os.environ.get("ODOO_USERNAME", "")
        self._odoo_pwd = os.environ.get("ODOO_PASSWORD", "")
        self._session = None
        self._uid = None
        # None = not resolved yet, 0 = resolved and absent, >0 = the user id
        self._delegated_uid = None

    def _get_stt_provider(self) -> str:
        provider = os.environ.get("STT_PROVIDER", "auto").strip().lower()
        if provider not in {"local", "openai", "auto"}:
            log(f"Invalid STT_PROVIDER '{provider}', falling back to 'auto'")
            return "auto"
        return provider

    def _get_stt_api_key(self) -> str:
        return (
            os.environ.get("STT_API_KEY", "").strip()
            or os.environ.get("OPENAI_API_KEY", "").strip()
        )

    def _is_stt_api_key_configured(self) -> bool:
        api_key = self._get_stt_api_key()
        return bool(
            api_key
            and api_key != "${OPENAI_API_KEY}"
            and api_key != "sk-your-api-key"
            and api_key != "${STT_API_KEY}"
        )

    def _get_stt_api_base(self) -> str:
        base = (
            os.environ.get("STT_API_BASE", "").strip()
            or os.environ.get("OPENAI_API_BASE", "").strip()
            or "https://api.openai.com/v1"
        )
        return base.rstrip("/")

    def _get_stt_model(self) -> str:
        return os.environ.get("STT_OPENAI_MODEL", "whisper-1").strip() or "whisper-1"

    def _authenticate(self):
        self._session = requests.Session()
        self._session.headers.update({"Content-Type": "application/json"})

        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "id": 1,
            "params": {
                "db": self._odoo_db,
                "login": self._odoo_user,
                "password": self._odoo_pwd,
            },
        }

        try:
            resp = self._session.post(
                f"{self._odoo_url}/web/session/authenticate", json=payload, timeout=15
            )
            resp.raise_for_status()
            data = resp.json()

            if data.get("error"):
                return {
                    "isError": True,
                    "content": f"Auth error: {data['error'].get('message', 'unknown')}",
                }

            result = data.get("result", {})
            self._uid = result.get("uid")
            if not self._uid:
                return {"isError": True, "content": "Authentication failed"}

            log(f"Authenticated to Odoo (uid={self._uid})")
            return None

        except Exception as e:
            return {"isError": True, "content": f"Connection error: {str(e)}"}

    # The gateway authenticates to Odoo as its own technical user (ODOO_USERNAME,
    # e.g. odooclaw_service, uid 28), which is NOT a member of the discuss channels
    # where voice notes are posted. Odoo gates ir.attachment reads on the channel
    # membership of the acting user, so reading the note as the gateway user fails
    # with an AccessError while the user's own client session sees it fine.
    #
    # The mail_bot_odooclaw module ships its own bot user (login "odooclaw_bot")
    # which IS a member of those channels and holds group_odooclaw_delegator. Read
    # the attachment through /odooclaw/call_kw_as_user delegated to that user; fall
    # back to a direct read when no such user exists on the deployment.
    #
    # NOTE: the user is resolved by LOGIN, not by xmlid. Reading ir.model.data
    # requires the "Settings" group, which this technical user does not have.
    #
    # NOTE: sender_id is deliberately NOT used here. The gateway only injects it for
    # servers listed in the Go trust list (odooclaw-manager / ocr-invoice), so a
    # sender-based delegation would be silently unavailable for this skill.
    _DELEGATED_BOT_LOGIN = "odooclaw_bot"

    def _resolve_delegated_user_id(self):
        """Resolve the Odoo user id of the module's channel-member bot."""
        if self._delegated_uid is not None:
            return self._delegated_uid or None

        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "id": 3,
            "params": {
                "model": "res.users",
                "method": "search_read",
                "args": [[["login", "=", self._DELEGATED_BOT_LOGIN]]],
                "kwargs": {"fields": ["id", "login"], "limit": 1},
            },
        }
        try:
            resp = self._session.post(
                f"{self._odoo_url}/web/dataset/call_kw", json=payload, timeout=30
            )
            resp.raise_for_status()
            rows = resp.json().get("result") or []
        except Exception as exc:
            log(f"Delegated-user lookup failed: {exc}")
            rows = []

        if not rows:
            log(
                f"Delegated user '{self._DELEGATED_BOT_LOGIN}' not found; "
                "falling back to a direct attachment read"
            )
            self._delegated_uid = 0
            return None

        self._delegated_uid = int(rows[0]["id"])
        log(f"Delegated attachment reads to uid={self._delegated_uid}")
        return self._delegated_uid

    def _read_attachment(self, attachment_id: int, delegated: bool) -> tuple:
        """Return (rows, error_message)."""
        fields = ["datas", "name", "mimetype"]
        if delegated:
            payload = {
                "user_id": self._resolve_delegated_user_id(),
                "model": "ir.attachment",
                "method": "read",
                "args": [[attachment_id]],
                "kwargs": {"fields": fields},
            }
            endpoint = f"{self._odoo_url}/odooclaw/call_kw_as_user"
        else:
            payload = {
                "jsonrpc": "2.0",
                "method": "call",
                "id": 2,
                "params": {
                    "model": "ir.attachment",
                    "method": "read",
                    "args": [[attachment_id]],
                    "kwargs": {"fields": fields},
                },
            }
            endpoint = f"{self._odoo_url}/web/dataset/call_kw"

        resp = self._session.post(endpoint, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") == "error":
            return [], str(data.get("reason"))
        if data.get("error"):
            err = data["error"]
            detail = (err.get("data") or {}).get("name") or err.get("message")
            return [], str(detail)
        return data.get("result") or [], None

    def _download_attachment(self, attachment_id: int) -> dict:
        if not self._uid:
            auth_err = self._authenticate()
            if auth_err:
                return auth_err

        try:
            rows, err = self._read_attachment(attachment_id, delegated=True)
            if not rows:
                log(f"Delegated read failed ({err}); retrying as the gateway user")
                rows, err = self._read_attachment(attachment_id, delegated=False)
            if not rows:
                return {
                    "isError": True,
                    "content": f"Error reading attachment: {err or 'not found'}",
                }

            record = rows[0]
            if not record.get("datas"):
                return {"isError": True, "content": "Attachment has no data"}

            audio_data = base64.b64decode(record["datas"])
            log(f"Downloaded attachment {attachment_id}: {len(audio_data)} bytes")

            return {
                "data": audio_data,
                "name": record.get("name", "audio"),
                "mimetype": record.get("mimetype", "audio/mp4"),
            }

        except Exception as e:
            return {"isError": True, "content": f"Download error: {str(e)}"}

    def _transcribe_local(self, audio_data: bytes, audio_name: str) -> dict:
        """Transcribe using local whisper CLI"""
        try:
            # Determine audio extension
            ext = ".mp3"
            if audio_name.endswith(".ogg"):
                ext = ".ogg"
            elif audio_name.endswith(".wav"):
                ext = ".wav"
            elif audio_name.endswith(".m4a"):
                ext = ".m4a"
            elif audio_name.endswith(".webm"):
                ext = ".webm"

            # Write to temp file
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
                f.write(audio_data)
                tmp_audio = f.name

            try:
                log(f"Running local whisper on {tmp_audio}...")

                # Run whisper CLI
                result = subprocess.run(
                    [
                        "whisper",
                        tmp_audio,
                        "--model",
                        "small",
                        "--language",
                        "es",
                        "--output_format",
                        "txt",
                        "--output_dir",
                        tempfile.gettempdir(),
                    ],
                    capture_output=True,
                    text=True,
                    timeout=120,
                )

                if result.returncode != 0:
                    log(f"Whisper CLI error: {result.stderr}")
                    # Try without language specification
                    result = subprocess.run(
                        [
                            "whisper",
                            tmp_audio,
                            "--model",
                            "small",
                            "--output_format",
                            "txt",
                            "--output_dir",
                            tempfile.gettempdir(),
                        ],
                        capture_output=True,
                        text=True,
                        timeout=120,
                    )

                if result.returncode != 0:
                    return {
                        "isError": True,
                        "content": f"Whisper CLI failed: {result.stderr}",
                    }

                # Read output file
                base_name = os.path.splitext(os.path.basename(tmp_audio))[0]
                txt_file = os.path.join(tempfile.gettempdir(), f"{base_name}.txt")

                if os.path.exists(txt_file):
                    with open(txt_file, "r") as f:
                        text = f.read().strip()
                    try:
                        os.unlink(txt_file)
                    except:
                        pass

                    log(f"Transcription complete: {len(text)} chars")
                    return {
                        "text": text,
                        "language": "auto-detected",
                        "method": "whisper_cli_local",
                    }
                else:
                    return {"isError": True, "content": "Whisper output file not found"}

            finally:
                try:
                    os.unlink(tmp_audio)
                except:
                    pass

        except FileNotFoundError:
            return {
                "isError": True,
                "content": "Whisper CLI not found. Install with: pip install openai-whisper",
            }
        except subprocess.TimeoutExpired:
            return {"isError": True, "content": "Whisper transcription timeout (120s)"}
        except Exception as e:
            return {"isError": True, "content": f"Local Whisper error: {str(e)}"}

    def _transcribe_whisper_api(self, audio_data: bytes) -> dict:
        api_key = self._get_stt_api_key()
        api_base = self._get_stt_api_base()
        model = self._get_stt_model()

        if not self._is_stt_api_key_configured():
            return {
                "isError": True,
                "content": "STT API key not configured (set STT_API_KEY or OPENAI_API_KEY)",
            }

        try:
            files = {
                "file": ("audio.mp3", io.BytesIO(audio_data), "audio/mpeg"),
                "model": (None, model),
                "response_format": (None, "json"),
            }

            headers = {"Authorization": f"Bearer {api_key}"}

            resp = requests.post(
                f"{api_base}/audio/transcriptions",
                files=files,
                headers=headers,
                timeout=60,
            )
            resp.raise_for_status()

            result = resp.json()
            text = result.get("text", "")

            log(f"Whisper API transcription: {len(text)} chars")

            return {
                "text": text.strip(),
                "language": "auto-detected",
                "method": "whisper_api",
                "provider": "openai-compatible",
                "model": model,
                "api_base": api_base,
            }

        except Exception as e:
            return {"isError": True, "content": f"Whisper API error: {str(e)}"}

    def transcribe(self, attachment_id: int) -> dict:
        log(f"Starting transcription for attachment {attachment_id}")

        attach_result = self._download_attachment(attachment_id)
        if attach_result.get("isError"):
            return attach_result

        audio_data = attach_result["data"]
        audio_name = attach_result["name"]
        provider = self._get_stt_provider()
        log(f"STT provider mode: {provider}")

        if provider == "openai":
            log("Using Whisper API only...")
            return self._transcribe_whisper_api(audio_data)

        log("Trying local Whisper CLI...")
        result = self._transcribe_local(audio_data, audio_name)
        if not result.get("isError"):
            return result

        log(f"Local Whisper failed: {result.get('content')}")

        if provider == "local":
            return {
                "isError": True,
                "content": f"Local Whisper failed and STT_PROVIDER=local: {result.get('content')}",
            }

        log("Falling back to Whisper API (STT_PROVIDER=auto)...")
        return self._transcribe_whisper_api(audio_data)


stt_manager = WhisperSTT()


def build_tools():
    return [
        {
            "name": "whisper-transcribe",
            "description": (
                "Transcribe voice messages from Odoo attachments to text. "
                "Uses STT_PROVIDER mode: local | openai | auto (default). "
                "Supports OpenAI-compatible transcription endpoints. "
                "Use this when user sends a voice note or audio attachment that needs transcription."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "attachment_id": {
                        "type": "integer",
                        "description": "The Odoo ir.attachment record ID to transcribe",
                    }
                },
                "required": ["attachment_id"],
            },
        },
        {
            "name": "whisper-list-methods",
            "description": "List available transcription methods and their status.",
            "inputSchema": {"type": "object", "properties": {}},
        },
    ]


def handle_request(request: dict) -> dict | None:
    method = request.get("method")
    req_id = request.get("id")
    result = None

    if method == "initialize":
        result = {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "whisper-stt-mcp", "version": "1.0.0"},
        }

    elif method == "tools/list":
        result = {"tools": build_tools()}

    elif method == "tools/call":
        params = request.get("params", {})
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})

        if tool_name == "whisper-transcribe":
            attachment_id = tool_args.get("attachment_id")

            if not attachment_id:
                res = {"isError": True, "content": "'attachment_id' is required"}
            else:
                log(f"Transcribing attachment {attachment_id}")
                res = stt_manager.transcribe(attachment_id)

                if not res.get("isError"):
                    res["content"] = json.dumps(
                        {
                            "success": True,
                            "text": res.get("text"),
                            "language": res.get("language"),
                            "method": res.get("method"),
                            "message": "Transcription complete. Use this text as the user's message.",
                        }
                    )
                else:
                    res["content"] = res.get("content", "Unknown error")

        elif tool_name == "whisper-list-methods":
            # Check if whisper CLI is available
            try:
                result = subprocess.run(["which", "whisper"], capture_output=True)
                whisper_available = result.returncode == 0
            except:
                whisper_available = False

            provider_mode = stt_manager._get_stt_provider()
            api_available = stt_manager._is_stt_api_key_configured()

            res = {
                "content": json.dumps(
                    {
                        "provider_mode": provider_mode,
                        "methods": {
                            "whisper_cli_local": {
                                "available": whisper_available,
                                "description": "Local Whisper CLI (no API key)",
                            },
                            "whisper_api": {
                                "available": api_available,
                                "description": "OpenAI-compatible Whisper API (requires key)",
                                "api_base": stt_manager._get_stt_api_base(),
                                "model": stt_manager._get_stt_model(),
                            },
                        },
                        "default": provider_mode,
                    }
                )
            }

        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"},
            }

        result = {
            "content": [{"type": "text", "text": res.get("content", "")}],
            "isError": res.get("isError", False),
        }

    elif method == "notifications/initialized":
        return None

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown method: {method}"},
        }

    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def main():
    log("Whisper STT MCP server v1.0 started (CLI mode)")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
            if response is not None:
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
        except json.JSONDecodeError as e:
            log(f"Invalid JSON received: {e}")
        except Exception as e:
            log(f"Unhandled error: {e}")


if __name__ == "__main__":
    main()
