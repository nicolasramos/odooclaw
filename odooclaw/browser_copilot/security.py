from __future__ import annotations

import fnmatch
import os
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SecurityConfig:
    allowed_domains: list[str]
    token: str
    read_only: bool


def _parse_bool(value: Optional[str], default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def load_security_config() -> SecurityConfig:
    raw_domains = os.getenv("BROWSER_COPILOT_ALLOWED_DOMAINS", "localhost,127.0.0.1")
    domains = [item.strip().lower() for item in raw_domains.split(",") if item.strip()]
    token = os.getenv("BROWSER_COPILOT_TOKEN", "dev-token")
    read_only = _parse_bool(os.getenv("BROWSER_COPILOT_READ_ONLY"), default=True)
    return SecurityConfig(allowed_domains=domains, token=token, read_only=read_only)


def is_domain_allowed(domain: str, allowed_domains: list[str]) -> bool:
    normalized = domain.strip().lower()
    if not normalized:
        return False
    for pattern in allowed_domains:
        p = pattern.strip().lower()
        if p == "*":
            return True
        if fnmatch.fnmatch(normalized, p):
            return True
        if normalized == p:
            return True
        if p.startswith(".") and normalized.endswith(p):
            return True
        if p.startswith("*.") and normalized.endswith(p[1:]):
            return True
    return False


def require_token(expected_token: str, provided_token: Optional[str]) -> bool:
    return bool(provided_token) and provided_token == expected_token
