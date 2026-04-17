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

    def call_kw(self, 
                model: str, 
                method: str, 
                args: Optional[List[Any]] = None, 
                kwargs: Optional[Dict[str, Any]] = None,
                sender_id: Optional[int] = None) -> Any:
        """
        Executes a method on an Odoo model.
        If sender_id is provided, it attempts to route through the secure endpoint /odooclaw/call_kw_as_user
        to enforce Odoo's native Record Rules and Access Rights using the delegation mechanism.
        """
        self._ensure_authenticated()
        args = args or []
        kwargs = kwargs or {}
        
        # If we have a specific user (sender_id) in the context, we must impersonate to respect security.
        if sender_id:
            return self._call_kw_as_user(sender_id, model, method, args, kwargs)
        
        # Otherwise, standard call_kw (executed as the admin/bot user itself)
        # Note: In a fully strict mode, you might force sender_id on all MCP endpoints.
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
                "kwargs": kwargs
            }
        }
        
        return self._do_post(endpoint, payload)
        
    def _call_kw_as_user(self,
                         user_id: int,
                         model: str, 
                         method: str, 
                         args: List[Any], 
                         kwargs: Dict[str, Any]) -> Any:
        """Delegated execution leveraging Odoo's native security via mail_bot_odooclaw endpoint."""
        endpoint = f"{self.odoo_session.url}/odooclaw/call_kw_as_user"
        
        # Merge session context into kwargs context
        context = kwargs.pop("context", {})
        merged_context = self.odoo_session.context.copy()
        merged_context.update(context)
        
        payload = {
            "user_id": user_id,
            "model": model,
            "method": method,
            "args": args,
            "kwargs": kwargs,
            "context": merged_context
        }
        
        _logger.debug(f"Calling endpoint {endpoint} impersonating User {user_id} on {model}.{method}")
        return self._do_post(endpoint, payload)

    def _do_post(self, endpoint: str, payload: dict) -> Any:
        try:
            response = self.odoo_session.session.post(endpoint, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            # Check for generic server errors (e.g. from call_kw_as_user controller)
            if result.get("status") == "error":
                raise OdooRPCError(f"Delegated RPC Error: {result.get('reason')}")
                
            # Check for JSON-RPC specific errors
            if "error" in result:
                err_data = result["error"].get("data", {})
                err_msg = err_data.get("message", "Unknown error")
                err_debug = err_data.get("debug", "")
                raise OdooRPCError(f"RPC Error: {err_msg}\n{err_debug}")
                
            if "result" in result:
                # call_kw_as_user wraps result in {"status": "ok", "result": ...}
                if isinstance(result["result"], dict) and result["result"].get("status") == "ok":
                    return result["result"].get("result")
                return result["result"]
                
            return True
            
        except requests.RequestException as e:
            raise OdooRPCError(f"Network error during RPC call: {str(e)}")
