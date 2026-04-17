from typing import Any, Dict

from odoo_mcp.security.guards import (
    guard_model_access,
    guard_unlink,
    guard_write_fields,
)


def validate_model_access(model_name: str) -> None:
    guard_model_access(model_name)


def validate_write_fields(values: Dict[str, Any]) -> None:
    guard_write_fields(values)


def validate_unlink(model_name: str) -> None:
    guard_unlink(model_name)
