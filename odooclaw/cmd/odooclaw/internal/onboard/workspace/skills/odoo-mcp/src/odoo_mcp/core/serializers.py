from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit

# Synthetic key used to expose a clickable record URL in tool results.
# The `__` prefix mirrors Odoo's own synthetic convention (e.g. __last_update)
# and guarantees we never clobber a real stored field named "url".
RECORD_URL_KEY = "__url"


def build_record_url(base_url: str, model: str, record_id: int) -> Optional[str]:
    """Build a clickable Odoo web-client URL for a record.

    Format: ``{base}/web#id={id}&model={model}&view_type=form``. The hash
    routing is valid on Odoo 16/17/18 (legacy web client still handles it).

    Only http/https base URLs are accepted; anything else returns None so the
    caller can safely omit the URL field instead of leaking a non-web scheme.
    """
    if not base_url or not model or record_id is None:
        return None
    base = str(base_url).rstrip("/")
    if urlsplit(base).scheme.lower() not in ("http", "https"):
        return None
    return f"{base}/web#id={record_id}&model={model}&view_type=form"


def serialize_records(
    records: List[Dict[str, Any]],
    model: Optional[str] = None,
    base_url: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Clean up standard record reads.

    When ``model`` and ``base_url`` are provided, each record also gets a
    clickable ``__url`` pointing at its form view in the Odoo web client.
    """
    res = []
    for r in records:
        cleaned = {}
        for k, v in r.items():
            # Example: clean up binary data or long html
            if isinstance(v, str) and len(v) > 2000 and "html" in k.lower():
                cleaned[k] = f"<{len(v)} bytes of HTML content omitted>"
            else:
                cleaned[k] = v
        if model and base_url and cleaned.get("id") is not None:
            url = build_record_url(base_url, model, cleaned["id"])
            if url:
                cleaned[RECORD_URL_KEY] = url
        res.append(cleaned)
    return res


def serialize_schema(schema: Dict[str, Any]) -> str:
    """Minify the schema output so it does not overwhelm the LLM token context."""
    import json
    # You could filter out base fields (create_date etc.) if not requested
    return json.dumps(schema, indent=2)
