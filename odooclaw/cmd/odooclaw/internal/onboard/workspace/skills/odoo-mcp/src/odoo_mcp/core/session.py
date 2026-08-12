import threading
import requests
import logging
from typing import Dict, Any, Optional
from .exceptions import OdooAuthError

_logger = logging.getLogger(__name__)

class OdooSession:
    """Manages Odoo authentication and session state via JSON-RPC.

    Thread-safe: all public methods that mutate state are protected by a
    threading.Lock so concurrent tool calls cannot corrupt session state.
    """

    def __init__(self, url: str, db: str, username: str, password: str):
        self.url = url.rstrip('/')
        self.db = db
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.uid: Optional[int] = None
        self.session_id: Optional[str] = None
        self.context: Dict[str, Any] = {}
        # Lock to serialize authenticate() calls across threads
        self._lock = threading.Lock()

    def authenticate(self) -> None:
        """Authenticates with Odoo using the /web/session/authenticate endpoint.

        Thread-safe: acquires _lock before touching shared state so that
        concurrent requests are serialized and never race on uid/session_id.
        """
        with self._lock:
            auth_url = f"{self.url}/web/session/authenticate"
            payload = {
                "jsonrpc": "2.0",
                "method": "call",
                "params": {
                    "db": self.db,
                    "login": self.username,
                    "password": self.password,
                }
            }

            _logger.debug(f"Authenticating against {auth_url} for user {self.username}")
            try:
                response = self.session.post(auth_url, json=payload, timeout=10)
                response.raise_for_status()
                result = response.json()

                if "error" in result:
                    err_msg = result["error"].get("data", {}).get("message", "Unknown Auth Error")
                    raise OdooAuthError(f"Authentication failed: {err_msg}")

                if "result" not in result or not result["result"].get("uid"):
                    raise OdooAuthError("Authentication failed: Invalid credentials or missing uid.")

                data = result["result"]
                self.uid = data["uid"]
                self.session_id = data.get("session_id")
                self.context = data.get("user_context", {})
                _logger.info(f"Successfully authenticated as UID {self.uid}")

            except requests.RequestException as e:
                raise OdooAuthError(f"Network error during authentication: {str(e)}")

    def is_authenticated(self) -> bool:
        """Check if we have an active session UID.

        Thread-safe: reads self.uid under the lock so callers never see a
        torn value (uid set but context not yet updated).
        """
        with self._lock:
            return self.uid is not None

    def get_uid(self) -> int:
        """Return the current UID (thread-safe read).

        Raises AssertionError if not authenticated — this should never
        happen in normal operation because _ensure_authenticated() is
        called first in every tool function.
        """
        with self._lock:
            uid = self.uid
            assert uid is not None, "OdooSession not authenticated — get_uid() called before authenticate()"
            return uid

    def get_context(self) -> Dict[str, Any]:
        """Return a copy of the current user context (thread-safe read)."""
        with self._lock:
            return self.context.copy()
