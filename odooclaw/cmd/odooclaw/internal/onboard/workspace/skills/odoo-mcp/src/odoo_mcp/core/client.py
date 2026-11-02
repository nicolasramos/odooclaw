import logging
from typing import Any, Dict, List, Optional
import requests
from .session import OdooSession
from .exceptions import OdooRPCError

_logger = logging.getLogger(__name__)


class OdooClient:
    """Core client to execute Odoo RPC methods."""

    def __init__(self, session: OdooSession):
        self.odoo_session = session

    def _ensure_authenticated(self) -> None:
        if not self.odoo_session.is_authenticated():
            self.odoo_session.authenticate()

    def call_kw(
        self,
        model: str,
        method: str,
        args: Optional[List[Any]] = None,
        kwargs: Optional[Dict[str, Any]] = None,
        sender_id: Optional[int] = None,
    ) -> Any:
        """
        Executes a method on an Odoo model using standard Odoo JSON-RPC endpoint.

        `sender_id` is accepted for backward compatibility and audit metadata,
        but execution always occurs as the authenticated Odoo session user.
        """
        self._ensure_authenticated()
        args = args or []
        kwargs = kwargs or {}

        # Standard Odoo JSON-RPC endpoint
        endpoint = f"{self.odoo_session.url}/web/dataset/call_kw/{model}/{method}"

        # Merge session context into kwargs
        if "context" not in kwargs:
            kwargs["context"] = self.odoo_session.context.copy()

        payload = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "model": model,
                "method": method,
                "args": args,
                "kwargs": kwargs,
            },
        }

        return self._do_post(endpoint, payload)

    def _do_post(self, endpoint: str, payload: dict) -> Any:
        try:
            response = self.odoo_session.session.post(endpoint, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()

            # Check for JSON-RPC specific errors
            if "error" in result:
                err_data = result["error"].get("data", {})
                err_msg = err_data.get("message", "Unknown error")
                err_debug = err_data.get("debug", "")
                raise OdooRPCError(f"RPC Error: {err_msg}\n{err_debug}")

            if "result" in result:
                return result["result"]

            return True

        except requests.RequestException as e:
            raise OdooRPCError(f"Network error during RPC call: {str(e)}")

    def try_call_kw(
        self,
        model: str,
        method: str,
        args: Optional[List[Any]] = None,
        kwargs: Optional[Dict[str, Any]] = None,
        sender_id: Optional[int] = None,
        default: Any = None,
    ) -> Any:
        try:
            return self.call_kw(model, method, args=args, kwargs=kwargs, sender_id=sender_id)
        except OdooRPCError:
            return default

    def get_model_fields(self, model: str, sender_id: Optional[int] = None) -> Dict[str, Any]:
        return self.call_kw(model, "fields_get", sender_id=sender_id)

    def try_get_model_fields(
        self, model: str, sender_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        return self.try_call_kw(model, "fields_get", sender_id=sender_id, default=None)

    def model_exists(self, model: str, sender_id: Optional[int] = None) -> bool:
        return self.try_get_model_fields(model, sender_id=sender_id) is not None

    def field_exists(self, model: str, field_name: str, sender_id: Optional[int] = None) -> bool:
        fields = self.try_get_model_fields(model, sender_id=sender_id)
        return bool(fields and field_name in fields)
