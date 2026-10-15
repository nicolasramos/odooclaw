from typing import Any


def redact_sensitive_values(data: dict[str, Any]) -> dict[str, Any]:
    """Recursively redacts sensitive values like passwords or tokens before returning to LLM."""
    if not isinstance(data, dict):
        return data

    redacted: dict[str, Any] = {}
    sensitives = {"password", "secret", "token", "auth_code", "api_key"}

    for k, v in data.items():
        if any(s in k.lower() for s in sensitives):
            redacted[k] = "***REDACTED***"
        elif isinstance(v, dict):
            redacted[k] = redact_sensitive_values(v)
        elif isinstance(v, list) and v and isinstance(v[0], dict):
            redacted[k] = [redact_sensitive_values(i) for i in v]
        else:
            redacted[k] = v

    return redacted
