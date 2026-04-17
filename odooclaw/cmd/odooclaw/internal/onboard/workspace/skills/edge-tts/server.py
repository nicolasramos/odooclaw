#!/usr/bin/env python3
import sys
import os
import json
import base64
import asyncio
import tempfile
import uuid

try:
    import edge_tts
except ImportError:
    sys.stderr.write(
        "[edge-tts] ERROR: 'edge-tts' library not found. Install with: pip install edge-tts\n"
    )
    sys.exit(1)

try:
    import aiohttp
except ImportError:
    sys.stderr.write(
        "[edge-tts] ERROR: 'aiohttp' library not found. Install with: pip install aiohttp\n"
    )
    sys.exit(1)


def log(msg):
    sys.stderr.write(f"[edge-tts] {msg}\n")
    sys.stderr.flush()


class EdgeTTSManager:
    DEFAULT_VOICE = "es-ES-ElenaNeural"

    VOICE_OPTIONS = {
        "es-ES-ElenaNeural": "Spanish (Spain) - Female",
        "es-MX-DaliaNeural": "Spanish (Mexico) - Female",
        "es-AR-TomasNeural": "Spanish (Argentina) - Male",
        "en-US-JennyNeural": "English (US) - Female",
        "en-US-GuyNeural": "English (US) - Male",
        "en-GB-SoniaNeural": "English (UK) - Female",
        "en-GB-RyanNeural": "English (UK) - Male",
        "fr-FR-DeniseNeural": "French - Female",
        "fr-FR-HenriNeural": "French - Male",
        "de-DE-KatjaNeural": "German - Female",
        "de-DE-ConradNeural": "German - Male",
        "it-IT-ElsaNeural": "Italian - Female",
        "it-IT-DiegoNeural": "Italian - Male",
        "pt-BR-FranciscaNeural": "Portuguese (Brazil) - Female",
        "pt-BR-AntonioNeural": "Portuguese (Brazil) - Male",
        "zh-CN-XiaoxiaoNeural": "Chinese (Mandarin) - Female",
        "zh-CN-YunyangNeural": "Chinese (Mandarin) - Male",
        "ja-JP-NanamiNeural": "Japanese - Female",
        "ja-JP-KeitaNeural": "Japanese - Male",
    }

    def __init__(self):
        self._odoo_url = os.environ.get("ODOO_URL", "").rstrip("/")
        self._odoo_db = os.environ.get("ODOO_DB", "")
        self._odoo_user = os.environ.get("ODOO_USERNAME", "")
        self._odoo_pwd = os.environ.get("ODOO_PASSWORD", "")
        self._session = None
        self._uid = None

    async def _generate_audio(self, text: str, voice: str = None) -> bytes:
        if voice is None:
            voice = self.DEFAULT_VOICE

        communicate = edge_tts.Communicate(text, voice)

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            tmp_path = f.name

        try:
            await communicate.save(tmp_path)
            with open(tmp_path, "rb") as f:
                audio_data = f.read()
            return audio_data
        finally:
            try:
                os.unlink(tmp_path)
            except:
                pass

    def _authenticate(self):
        import requests

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

    def _upload_attachment(self, audio_data: bytes, filename: str) -> dict:
        import requests

        if not self._uid:
            auth_err = self._authenticate()
            if auth_err:
                return auth_err

        try:
            b64_data = base64.b64encode(audio_data).decode("utf-8")

            attachment_vals = {
                "name": filename,
                "datas": b64_data,
                "res_model": "discuss.channel",
                "res_id": 0,
            }

            payload = {
                "jsonrpc": "2.0",
                "method": "call",
                "id": 2,
                "params": {
                    "model": "ir.attachment",
                    "method": "create",
                    "args": [attachment_vals],
                    "kwargs": {},
                },
            }

            resp = self._session.post(
                f"{self._odoo_url}/web/dataset/call_kw", json=payload, timeout=30
            )
            resp.raise_for_status()
            data = resp.json()

            if data.get("error"):
                return {
                    "isError": True,
                    "content": f"Error creating attachment: {data['error'].get('message', 'unknown')}",
                }

            attachment_id = data.get("result")
            log(f"Created attachment ID: {attachment_id}")
            return {"attachment_id": attachment_id}

        except Exception as e:
            return {"isError": True, "content": f"Upload error: {str(e)}"}

    def _create_voice_metadata(self, attachment_id: int) -> dict:
        import requests

        if not self._uid:
            auth_err = self._authenticate()
            if auth_err:
                return auth_err

        try:
            payload = {
                "jsonrpc": "2.0",
                "method": "call",
                "id": 3,
                "params": {
                    "model": "discuss.voice.metadata",
                    "method": "create",
                    "args": [{"attachment_id": attachment_id}],
                    "kwargs": {},
                },
            }

            resp = self._session.post(
                f"{self._odoo_url}/web/dataset/call_kw", json=payload, timeout=30
            )
            resp.raise_for_status()
            data = resp.json()

            if data.get("error"):
                return {
                    "isError": True,
                    "content": f"Error creating voice metadata: {data['error'].get('message', 'unknown')}",
                }

            metadata_id = data.get("result")
            log(f"Created voice metadata ID: {metadata_id}")
            return {"metadata_id": metadata_id}

        except Exception as e:
            return {"isError": True, "content": f"Voice metadata error: {str(e)}"}

    def synthesize_and_upload(self, text: str, voice: str = None) -> dict:
        if not all([self._odoo_url, self._odoo_db, self._odoo_user, self._odoo_pwd]):
            return {
                "isError": True,
                "content": "Missing Odoo credentials (ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD)",
            }

        try:
            audio_data = asyncio.run(self._generate_audio(text, voice))
        except Exception as e:
            return {"isError": True, "content": f"TTS generation failed: {str(e)}"}

        filename = f"voice_{uuid.uuid4().hex[:8]}.mp3"

        attach_result = self._upload_attachment(audio_data, filename)
        if attach_result.get("isError"):
            return attach_result

        attachment_id = attach_result["attachment_id"]

        metadata_result = self._create_voice_metadata(attachment_id)
        if metadata_result.get("isError"):
            return metadata_result

        return {
            "attachment_id": attachment_id,
            "metadata_id": metadata_result.get("metadata_id"),
            "filename": filename,
        }


tts_manager = EdgeTTSManager()


def build_tools():
    return [
        {
            "name": "edge-tts-synthesize",
            "description": (
                "Generate audio from text using Microsoft Edge TTS (Text-to-Speech) and upload to Odoo as a voice attachment. "
                "Use this when the user asks for voice response, audio output, or 'speak this'. "
                "The audio is automatically uploaded to Odoo as an ir.attachment with discuss.voice.metadata for playback in Discuss. "
                f"Default voice: {EdgeTTSManager.DEFAULT_VOICE}. "
                "Available voices include: es-ES-ElenaNeural (Spanish), es-MX-DaliaNeural (Mexican Spanish), en-US-JennyNeural, en-US-GuyNeural, "
                "en-GB-SoniaNeural, fr-FR-DeniseNeural, de-DE-KatjaNeural, it-IT-ElsaNeural, pt-BR-FranciscaNeural, zh-CN-XiaoxiaoNeural, ja-JP-NanamiNeural."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Text to convert to speech (max ~1000 chars recommended)",
                    },
                    "voice": {
                        "type": "string",
                        "description": "Voice name (e.g., 'es-ES-ElenaNeural', 'en-US-JennyNeural'). Default: es-ES-ElenaNeural",
                    },
                },
                "required": ["text"],
            },
        },
        {
            "name": "edge-tts-list-voices",
            "description": "List all available Edge TTS voices with their language and description.",
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
            "serverInfo": {"name": "edge-tts-mcp", "version": "1.0.0"},
        }

    elif method == "tools/list":
        result = {"tools": build_tools()}

    elif method == "tools/call":
        params = request.get("params", {})
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})

        if tool_name == "edge-tts-synthesize":
            text = tool_args.get("text")
            voice = tool_args.get("voice")

            if not text:
                res = {"isError": True, "content": "'text' is required"}
            else:
                log(
                    f"Synthesizing: {text[:50]}... with voice: {voice or EdgeTTSManager.DEFAULT_VOICE}"
                )
                res = tts_manager.synthesize_and_upload(text, voice)

                if not res.get("isError"):
                    res["content"] = json.dumps(
                        {
                            "success": True,
                            "attachment_id": res.get("attachment_id"),
                            "voice_metadata_id": res.get("metadata_id"),
                            "message": "Audio generated successfully. Use odoo-manager to post to Odoo with attachment_ids and voice_ids.",
                            "odoo_message_post": {
                                "body": "🎤 Nota de voz",
                                "attachment_ids": [res.get("attachment_id")],
                                "voice_ids": [res.get("metadata_id")],
                            },
                        }
                    )
                else:
                    res["content"] = res.get("content", "Unknown error")

        elif tool_name == "edge-tts-list-voices":
            res = {
                "content": json.dumps(
                    {
                        "voices": EdgeTTSManager.VOICE_OPTIONS,
                        "default": EdgeTTSManager.DEFAULT_VOICE,
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
    log("Edge TTS MCP server v1.0 started")
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
