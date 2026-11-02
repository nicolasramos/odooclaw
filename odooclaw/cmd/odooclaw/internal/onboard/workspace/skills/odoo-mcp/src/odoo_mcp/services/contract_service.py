from typing import Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.capability_service import (
    build_success_response,
    build_unsupported_response,
)


def _line_fields(client: OdooClient, user_id: int) -> Optional[dict]:
    return client.try_get_model_fields("contract.line")


def _contract_fields(client: OdooClient, user_id: int) -> Optional[dict]:
    return client.try_get_model_fields("contract.contract")


def _first_present(fields: dict, *names: str) -> Optional[str]:
    for name in names:
        if name in fields:
            return name
    return None


def _unsupported_contracts() -> dict:
    return build_unsupported_response(
        "contracts.manage_lines",
        "Contract tools require contract.contract and contract.line models.",
        ["contract.contract", "contract.line"],
    )


def create_contract_line(
    client: OdooClient,
    user_id: int,
    contract_id: int,
    product_id: Optional[int] = None,
    name: Optional[str] = None,
    quantity: Optional[float] = None,
    price_unit: Optional[float] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
) -> dict:
    line_fields = _line_fields(client, user_id)
    contract_fields = _contract_fields(client, user_id)
    if not line_fields or not contract_fields:
        return _unsupported_contracts()

    values = {}
    contract_field = _first_present(line_fields, "contract_id", "contract_line_id")
    if contract_field:
        values[contract_field] = contract_id
    if product_id and "product_id" in line_fields:
        values["product_id"] = product_id
    if name:
        name_field = _first_present(line_fields, "name", "description")
        if name_field:
            values[name_field] = name
    if quantity is not None:
        qty_field = _first_present(line_fields, "quantity", "qty", "product_uom_qty")
        if qty_field:
            values[qty_field] = quantity
    if price_unit is not None and "price_unit" in line_fields:
        values["price_unit"] = price_unit
    if date_start and "date_start" in line_fields:
        values["date_start"] = date_start
    if date_end and "date_end" in line_fields:
        values["date_end"] = date_end

    line_id = client.call_kw(
        "contract.line", "create", args=[values]
    )
    return build_success_response(
        "contracts.create_line", line_id=line_id, values=values
    )


def close_contract_line(
    client: OdooClient,
    user_id: int,
    line_id: int,
    reason: Optional[str] = None,
    close_date: Optional[str] = None,
) -> dict:
    line_fields = _line_fields(client, user_id)
    if not line_fields:
        return _unsupported_contracts()

    values = {}
    if close_date and "date_end" in line_fields:
        values["date_end"] = close_date
    if reason:
        reason_field = _first_present(line_fields, "name", "description")
        if reason_field:
            values[reason_field] = reason
    if "active" in line_fields:
        values["active"] = False

    if not values:
        return build_unsupported_response(
            "contracts.close_line",
            "contract.line exists but does not expose close-compatible fields.",
            ["date_end", "active", "name|description"],
        )

    client.call_kw(
        "contract.line", "write", args=[[line_id], values]
    )
    return build_success_response(
        "contracts.close_line", line_id=line_id, values=values
    )


def replace_contract_line(
    client: OdooClient,
    user_id: int,
    line_id: int,
    product_id: Optional[int] = None,
    name: Optional[str] = None,
    quantity: Optional[float] = None,
    price_unit: Optional[float] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    close_reason: Optional[str] = None,
) -> dict:
    line_fields = _line_fields(client, user_id)
    if not line_fields:
        return _unsupported_contracts()

    contract_field = _first_present(line_fields, "contract_id", "contract_line_id")
    read_fields = [
        field
        for field in (
            contract_field,
            "product_id",
            _first_present(line_fields, "name", "description"),
        )
        if field
    ]
    current = client.call_kw(
        "contract.line",
        "read",
        args=[[line_id]],
        kwargs={"fields": read_fields},
        sender_id=user_id,
    )
    if not current:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "contracts.replace_line",
            "message": f"Contract line {line_id} was not found.",
        }

    current_line = current[0]
    contract_ref = current_line.get(contract_field) if contract_field else None
    contract_id = contract_ref[0] if isinstance(contract_ref, list) else contract_ref
    current_name_field = _first_present(line_fields, "name", "description")

    close_result = close_contract_line(
        client, user_id, line_id, reason=close_reason, close_date=date_start
    )
    create_result = create_contract_line(
        client,
        user_id,
        contract_id=contract_id,
        product_id=product_id or (current_line.get("product_id") or [None])[0],
        name=name or current_line.get(current_name_field),
        quantity=quantity,
        price_unit=price_unit,
        date_start=date_start,
        date_end=date_end,
    )
    return build_success_response(
        "contracts.replace_line",
        old_line_id=line_id,
        close_result=close_result,
        new_line=create_result,
    )
