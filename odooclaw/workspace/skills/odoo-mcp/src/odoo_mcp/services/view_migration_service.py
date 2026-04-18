from __future__ import annotations

import difflib
import re
from datetime import datetime, timezone
from uuid import uuid4
import xml.etree.ElementTree as ET
from typing import Any, Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.audit import log_audit_event
from odoo_mcp.services.capability_service import (
    build_success_response,
    build_unsupported_response,
)

_VIEW_MODELS = {"ir.ui.view", "ir.model.data", "ir.actions.report"}


def _parse_xmlid(xmlid: str) -> Optional[tuple[str, str]]:
    if not xmlid or "." not in xmlid:
        return None
    module, name = xmlid.split(".", 1)
    if not module or not name:
        return None
    return module, name


def _resolve_xmlid(
    client: OdooClient,
    sender_id: int,
    xmlid: str,
    expected_model: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    parsed = _parse_xmlid(xmlid)
    if not parsed:
        return None

    module, name = parsed
    rows = client.call_kw(
        "ir.model.data",
        "search_read",
        args=[[["module", "=", module], ["name", "=", name]]],
        kwargs={"fields": ["id", "model", "res_id", "module", "name"], "limit": 1},
        sender_id=sender_id,
    )
    if not rows:
        return None

    row = rows[0]
    if expected_model and row.get("model") != expected_model:
        return None
    return row


def _is_well_formed_xml(xml_text: str) -> tuple[bool, Optional[str]]:
    try:
        ET.fromstring(xml_text)
        return True, None
    except ET.ParseError as exc:
        return False, str(exc)


def _normalize_xpath(xpath: str) -> str:
    trimmed = (xpath or "").strip()
    if trimmed.startswith("//"):
        return f".{trimmed}"
    return trimmed


def _count_xpath_matches(xml_text: str, xpath: str) -> tuple[int, Optional[str]]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        return 0, f"Invalid base XML: {exc}"

    normalized = _normalize_xpath(xpath)
    if not normalized:
        return 0, "XPath is empty"

    try:
        matches = root.findall(normalized)
        return len(matches), None
    except SyntaxError as exc:
        return 0, f"Unsupported xpath syntax: {exc}"


def _scan_arch_migration_issues(
    arch_text: str,
    target_version: str,
    is_qweb: bool,
) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []

    def add_issue(
        rule_id: str,
        severity: str,
        path: str,
        message: str,
        suggested_fix: str,
    ) -> None:
        issues.append(
            {
                "rule_id": rule_id,
                "severity": severity,
                "path": path,
                "message": message,
                "suggested_fix": suggested_fix,
            }
        )

    if target_version.startswith(("17", "18")):
        if re.search(r"\battrs\s*=", arch_text) or re.search(
            r"\bstates\s*=", arch_text
        ):
            add_issue(
                "ATTRS_STATES_LEGACY",
                "high",
                "//*[@attrs or @states]",
                "Legacy attrs/states syntax detected.",
                "Migrate attrs/states to inline expressions compatible with Odoo 17+.",
            )

    if target_version.startswith("18"):
        if re.search(r"<\s*tree\b", arch_text):
            add_issue(
                "TREE_TO_LIST",
                "high",
                "//tree",
                "Tree view tag is deprecated in Odoo 18.",
                "Replace <tree> with <list> and </tree> with </list>.",
            )

        if re.search(r"oe_chatter", arch_text):
            add_issue(
                "CHATTER_MODERNIZATION",
                "medium",
                "//*[contains(@class,'oe_chatter')]",
                "Legacy chatter container detected.",
                "Use <chatter /> component where compatible.",
            )

    if is_qweb and re.search(r"\bt-raw\s*=", arch_text):
        add_issue(
            "QWEB_T_RAW",
            "high",
            "//*[@t-raw]",
            "Use of t-raw can expose unsafe HTML rendering.",
            "Prefer escaped rendering (for example t-out) unless trusted content is guaranteed.",
        )

    return issues


def _issue_summary(issues: list[dict[str, Any]]) -> dict[str, int]:
    summary = {"high": 0, "medium": 0, "low": 0}
    for issue in issues:
        severity = issue.get("severity", "low")
        if severity in summary:
            summary[severity] += 1
    return summary


def _build_advisory_patch(issues: list[dict[str, Any]]) -> dict[str, Any]:
    operations: list[dict[str, Any]] = []
    replacements: list[dict[str, str]] = []

    for issue in issues:
        if issue["rule_id"] == "TREE_TO_LIST":
            operations.append(
                {
                    "type": "replace_tag",
                    "from": "tree",
                    "to": "list",
                    "reason": issue["rule_id"],
                }
            )
            replacements.append({"from": "<tree", "to": "<list"})
            replacements.append({"from": "</tree>", "to": "</list>"})
        else:
            operations.append(
                {
                    "type": "manual_review",
                    "rule_id": issue["rule_id"],
                    "message": issue["message"],
                    "suggested_fix": issue["suggested_fix"],
                }
            )

    return {
        "patch_format": "advisory_patch",
        "operations": operations,
        "replacements": replacements,
    }


def _apply_advisory_patch(xml_text: str, patch: dict[str, Any]) -> str:
    result = xml_text
    for replacement in patch.get("replacements", []):
        from_text = replacement.get("from")
        to_text = replacement.get("to")
        if from_text is None or to_text is None:
            continue
        result = result.replace(from_text, to_text)
    return result


def _safe_models_available(client: OdooClient, sender_id: int) -> bool:
    for model in _VIEW_MODELS:
        if not client.model_exists(model, sender_id=sender_id):
            return False
    return True


def _validate_xml_inheritance_patch(
    base_arch: str,
    patch: dict[str, Any],
    *,
    strict: bool,
) -> tuple[dict[str, Any], list[str], list[str]]:
    checks: dict[str, Any] = {
        "xml_well_formed": False,
        "xpath_matches": [],
        "forbidden_patterns": [],
    }
    warnings: list[str] = []
    errors: list[str] = []

    xml_ok, xml_error = _is_well_formed_xml(base_arch)
    checks["xml_well_formed"] = xml_ok
    if xml_error:
        errors.append(xml_error)

    if patch.get("patch_format") != "xml_inheritance":
        errors.append("apply_safe only supports patch_format=xml_inheritance.")
        return checks, warnings, errors

    operations = patch.get("operations", [])
    if not operations:
        errors.append("Patch operations are required for xml_inheritance apply.")
        return checks, warnings, errors

    for operation in operations:
        xpath = operation.get("xpath", "")
        count, match_error = _count_xpath_matches(base_arch, xpath)
        checks["xpath_matches"].append({"xpath": xpath, "count": count})
        if match_error:
            errors.append(match_error)
            continue
        if count == 0:
            errors.append(f"XPath '{xpath}' did not match any nodes")
        elif strict and count > 1:
            errors.append(f"XPath '{xpath}' matched {count} nodes in strict mode")

    if re.search(r"<\s*record\b", str(patch)):
        checks["forbidden_patterns"].append("record_tag")
        errors.append("Patch must not include <record> declarations.")

    return checks, warnings, errors


def _build_inheritance_arch_from_patch(patch: dict[str, Any]) -> str:
    data_node = ET.Element("data")
    for operation in patch.get("operations", []):
        xpath = (operation.get("xpath") or "").strip()
        position = (operation.get("position") or "inside").strip()
        if not xpath:
            continue

        xpath_node = ET.SubElement(data_node, "xpath", expr=xpath, position=position)

        attributes = operation.get("attributes") or {}
        for attr_name, attr_value in attributes.items():
            attr_node = ET.SubElement(xpath_node, "attribute", name=str(attr_name))
            attr_node.text = "" if attr_value is None else str(attr_value)

        content = operation.get("content")
        if content:
            fragment_root = ET.fromstring(f"<fragment>{content}</fragment>")
            for child in list(fragment_root):
                xpath_node.append(child)

    return ET.tostring(data_node, encoding="unicode")


def _build_apply_snapshot(
    *,
    kind: str,
    created_view_id: int,
    base_xmlid: str,
    patch: dict[str, Any],
) -> dict[str, Any]:
    return {
        "snapshot_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "kind": kind,
        "rollback_action": "deactivate_created_view",
        "created_view_id": created_view_id,
        "base_xmlid": base_xmlid,
        "patch_format": patch.get("patch_format"),
        "operations_count": len(patch.get("operations", [])),
    }


def get_view_by_xmlid(
    client: OdooClient,
    sender_id: int,
    xmlid: str,
    include_inherited_chain: bool = True,
) -> dict[str, Any]:
    if not _safe_models_available(client, sender_id):
        return build_unsupported_response(
            "views.get_view_by_xmlid",
            "Required models for view inspection are not available.",
            sorted(_VIEW_MODELS),
        )

    xml_row = _resolve_xmlid(client, sender_id, xmlid, expected_model="ir.ui.view")
    if not xml_row:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "views.get_view_by_xmlid",
            "message": f"View xmlid '{xmlid}' was not found.",
        }

    view_id = xml_row["res_id"]
    view_rows = client.call_kw(
        "ir.ui.view",
        "read",
        args=[[view_id]],
        kwargs={
            "fields": [
                "id",
                "name",
                "model",
                "type",
                "inherit_id",
                "priority",
                "arch_db",
                "key",
                "active",
            ]
        },
        sender_id=sender_id,
    )
    if not view_rows:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "views.get_view_by_xmlid",
            "message": f"View ID '{view_id}' was not found.",
        }

    inherited_chain: list[dict[str, Any]] = []
    if include_inherited_chain:
        inherited_chain = client.call_kw(
            "ir.ui.view",
            "search_read",
            args=[[["inherit_id", "=", view_id]]],
            kwargs={
                "fields": ["id", "name", "key", "priority", "active"],
                "limit": 100,
            },
            sender_id=sender_id,
        )

    view = view_rows[0]
    log_audit_event(
        "VIEW_READ",
        sender_id,
        "ir.ui.view",
        {
            "xmlid": xmlid,
            "view_id": view_id,
            "include_inherited_chain": include_inherited_chain,
        },
    )
    return build_success_response(
        "views.get_view_by_xmlid",
        view={
            "id": view.get("id"),
            "name": view.get("name"),
            "xmlid": xmlid,
            "model": view.get("model"),
            "type": view.get("type"),
            "inherit_id": view.get("inherit_id"),
            "priority": view.get("priority"),
            "key": view.get("key"),
            "active": view.get("active"),
            "arch_db": view.get("arch_db"),
        },
        inherited_chain=inherited_chain,
    )


def find_views_by_model(
    client: OdooClient,
    sender_id: int,
    model: str,
    view_type: Optional[str] = None,
    limit: int = 50,
) -> dict[str, Any]:
    domain: list[list[Any]] = [["model", "=", model]]
    if view_type:
        domain.append(["type", "=", view_type])

    rows = client.call_kw(
        "ir.ui.view",
        "search_read",
        args=[domain],
        kwargs={
            "fields": [
                "id",
                "name",
                "key",
                "model",
                "type",
                "inherit_id",
                "priority",
                "active",
            ],
            "order": "priority asc, id asc",
            "limit": limit,
        },
        sender_id=sender_id,
    )
    log_audit_event(
        "VIEW_FIND",
        sender_id,
        "ir.ui.view",
        {"model": model, "view_type": view_type, "limit": limit, "count": len(rows)},
    )
    return build_success_response(
        "views.find_views_by_model", count=len(rows), views=rows
    )


def get_report_template(
    client: OdooClient, sender_id: int, xmlid: str
) -> dict[str, Any]:
    xml_row = _resolve_xmlid(
        client, sender_id, xmlid, expected_model="ir.actions.report"
    )
    if not xml_row:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "reports.get_report_template",
            "message": f"Report xmlid '{xmlid}' was not found.",
        }

    report_rows = client.call_kw(
        "ir.actions.report",
        "read",
        args=[[xml_row["res_id"]]],
        kwargs={
            "fields": [
                "id",
                "name",
                "model",
                "report_name",
                "report_type",
                "binding_model_id",
            ]
        },
        sender_id=sender_id,
    )
    if not report_rows:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "reports.get_report_template",
            "message": f"Report action ID '{xml_row['res_id']}' was not found.",
        }

    report = report_rows[0]
    report_name = report.get("report_name")
    domain: list[Any] = []
    if report_name:
        domain = ["|", ["key", "=", report_name], ["name", "=", report_name]]
    rows = client.call_kw(
        "ir.ui.view",
        "search_read",
        args=[domain],
        kwargs={
            "fields": ["id", "name", "key", "type", "arch_db", "inherit_id"],
            "limit": 10,
        },
        sender_id=sender_id,
    )

    primary_template = rows[0] if rows else None
    log_audit_event(
        "REPORT_TEMPLATE_READ",
        sender_id,
        "ir.actions.report",
        {"xmlid": xmlid, "report_id": report.get("id"), "template_matches": len(rows)},
    )
    return build_success_response(
        "reports.get_report_template",
        report={"xmlid": xmlid, **report},
        template=primary_template,
        candidates=rows,
    )


def scan_view_migration_issues(
    client: OdooClient,
    sender_id: int,
    xmlid: str,
    target_version: str,
    rule_sets: Optional[list[str]] = None,
) -> dict[str, Any]:
    view_response = get_view_by_xmlid(
        client, sender_id, xmlid, include_inherited_chain=False
    )
    if not view_response.get("ok"):
        return view_response

    arch_text = view_response["view"].get("arch_db") or ""
    issues = _scan_arch_migration_issues(
        arch_text, target_version=target_version, is_qweb=False
    )
    summary = _issue_summary(issues)
    log_audit_event(
        "VIEW_SCAN",
        sender_id,
        "ir.ui.view",
        {"xmlid": xmlid, "target_version": target_version, "summary": summary},
    )
    return build_success_response(
        "views.scan_migration_issues",
        xmlid=xmlid,
        view_id=view_response["view"].get("id"),
        arch_db=arch_text,
        target_version=target_version,
        rule_sets=rule_sets or [],
        issues=issues,
        summary=summary,
    )


def scan_report_migration_issues(
    client: OdooClient,
    sender_id: int,
    xmlid: str,
    target_version: str,
    rule_sets: Optional[list[str]] = None,
) -> dict[str, Any]:
    report_response = get_report_template(client, sender_id, xmlid)
    if not report_response.get("ok"):
        return report_response

    template = report_response.get("template") or {}
    arch_text = template.get("arch_db") or ""
    issues = _scan_arch_migration_issues(
        arch_text, target_version=target_version, is_qweb=True
    )
    summary = _issue_summary(issues)
    log_audit_event(
        "REPORT_SCAN",
        sender_id,
        "ir.actions.report",
        {"xmlid": xmlid, "target_version": target_version, "summary": summary},
    )
    return build_success_response(
        "reports.scan_migration_issues",
        xmlid=xmlid,
        report_id=(report_response.get("report") or {}).get("id"),
        template_arch_db=arch_text,
        target_version=target_version,
        rule_sets=rule_sets or [],
        issues=issues,
        summary=summary,
    )


def propose_view_patch(
    client: OdooClient,
    sender_id: int,
    xmlid: str,
    intent: str,
    constraints: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    scan = scan_view_migration_issues(client, sender_id, xmlid, target_version="18.0")
    if not scan.get("ok"):
        return scan

    constraints = constraints or {}
    patch = _build_advisory_patch(scan["issues"])
    base_arch = scan.get("arch_db") or ""
    result_arch_preview = _apply_advisory_patch(base_arch, patch)
    log_audit_event(
        "VIEW_PROPOSE",
        sender_id,
        "ir.ui.view",
        {
            "xmlid": xmlid,
            "intent": intent,
            "operations": len(patch.get("operations", [])),
        },
    )
    return build_success_response(
        "views.propose_patch",
        xmlid=xmlid,
        intent=intent,
        constraints=constraints,
        proposal={**patch, "result_arch_preview": result_arch_preview},
        risk_level="medium" if scan["summary"].get("high") else "low",
        notes=["No base view overwrite proposed."],
    )


def propose_report_patch(
    client: OdooClient,
    sender_id: int,
    xmlid: str,
    intent: str,
    constraints: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    scan = scan_report_migration_issues(client, sender_id, xmlid, target_version="18.0")
    if not scan.get("ok"):
        return scan

    constraints = constraints or {}
    patch = _build_advisory_patch(scan["issues"])
    base_arch = scan.get("template_arch_db") or ""
    result_arch_preview = _apply_advisory_patch(base_arch, patch)
    log_audit_event(
        "REPORT_PROPOSE",
        sender_id,
        "ir.actions.report",
        {
            "xmlid": xmlid,
            "intent": intent,
            "operations": len(patch.get("operations", [])),
        },
    )
    return build_success_response(
        "reports.propose_patch",
        xmlid=xmlid,
        intent=intent,
        constraints=constraints,
        proposal={**patch, "result_arch_preview": result_arch_preview},
        risk_level="medium" if scan["summary"].get("high") else "low",
        notes=["No base template overwrite proposed."],
    )


def validate_view_patch(
    client: OdooClient,
    sender_id: int,
    base_view_xmlid: str,
    patch: dict[str, Any],
    strict: bool = True,
    target_version: str = "18.0",
) -> dict[str, Any]:
    view_response = get_view_by_xmlid(
        client, sender_id, base_view_xmlid, include_inherited_chain=False
    )
    if not view_response.get("ok"):
        return view_response

    base_arch = view_response["view"].get("arch_db") or ""
    checks: dict[str, Any] = {
        "xml_well_formed": False,
        "xpath_matches": [],
        "forbidden_patterns": [],
        "version_compatibility": True,
    }
    warnings: list[str] = []
    errors: list[str] = []

    xml_ok, xml_error = _is_well_formed_xml(base_arch)
    checks["xml_well_formed"] = xml_ok
    if xml_error:
        errors.append(xml_error)

    patch_format = patch.get("patch_format")
    if patch_format == "xml_inheritance":
        for operation in patch.get("operations", []):
            xpath = operation.get("xpath", "")
            count, match_error = _count_xpath_matches(base_arch, xpath)
            checks["xpath_matches"].append({"xpath": xpath, "count": count})
            if match_error:
                errors.append(match_error)
            elif count == 0:
                errors.append(f"XPath '{xpath}' did not match any nodes")
            elif strict and count > 1:
                errors.append(f"XPath '{xpath}' matched {count} nodes in strict mode")
    elif patch_format == "advisory_patch":
        # advisory patch does not directly execute xpath mutations
        checks["xpath_matches"] = []
    else:
        errors.append(
            "Unsupported patch_format. Use xml_inheritance or advisory_patch."
        )

    if re.search(r"<\s*record\b", str(patch)):
        checks["forbidden_patterns"].append("record_tag")
        errors.append("Patch must not include <record> declarations.")

    simulated_after = (
        _apply_advisory_patch(base_arch, patch)
        if patch_format == "advisory_patch"
        else base_arch
    )
    issues_after = _scan_arch_migration_issues(
        simulated_after, target_version=target_version, is_qweb=False
    )
    checks["version_compatibility"] = (
        len([i for i in issues_after if i["severity"] == "high"]) == 0
    )
    if not checks["version_compatibility"]:
        warnings.append("Patch still leaves high-severity migration issues.")

    valid = not errors
    log_audit_event(
        "VIEW_VALIDATE",
        sender_id,
        "ir.ui.view",
        {"base_view_xmlid": base_view_xmlid, "valid": valid, "errors": len(errors)},
    )
    return build_success_response(
        "views.validate_patch",
        valid=valid,
        checks=checks,
        warnings=warnings,
        errors=errors,
    )


def validate_report_patch(
    client: OdooClient,
    sender_id: int,
    report_xmlid: str,
    patch: dict[str, Any],
    strict: bool = True,
    target_version: str = "18.0",
) -> dict[str, Any]:
    report_response = get_report_template(client, sender_id, report_xmlid)
    if not report_response.get("ok"):
        return report_response

    template = report_response.get("template") or {}
    base_arch = template.get("arch_db") or ""
    checks: dict[str, Any] = {
        "xml_well_formed": False,
        "xpath_matches": [],
        "forbidden_patterns": [],
        "version_compatibility": True,
    }
    warnings: list[str] = []
    errors: list[str] = []

    xml_ok, xml_error = _is_well_formed_xml(base_arch)
    checks["xml_well_formed"] = xml_ok
    if xml_error:
        errors.append(xml_error)

    patch_format = patch.get("patch_format")
    if patch_format == "xml_inheritance":
        for operation in patch.get("operations", []):
            xpath = operation.get("xpath", "")
            count, match_error = _count_xpath_matches(base_arch, xpath)
            checks["xpath_matches"].append({"xpath": xpath, "count": count})
            if match_error:
                errors.append(match_error)
            elif count == 0:
                errors.append(f"XPath '{xpath}' did not match any nodes")
            elif strict and count > 1:
                errors.append(f"XPath '{xpath}' matched {count} nodes in strict mode")
    elif patch_format == "advisory_patch":
        checks["xpath_matches"] = []
    else:
        errors.append(
            "Unsupported patch_format. Use xml_inheritance or advisory_patch."
        )

    if re.search(r"\bt-raw\s*=", str(patch)):
        checks["forbidden_patterns"].append("t-raw")
        warnings.append("Patch includes t-raw usage. Review security implications.")

    simulated_after = (
        _apply_advisory_patch(base_arch, patch)
        if patch_format == "advisory_patch"
        else base_arch
    )
    issues_after = _scan_arch_migration_issues(
        simulated_after, target_version=target_version, is_qweb=True
    )
    checks["version_compatibility"] = (
        len([i for i in issues_after if i["severity"] == "high"]) == 0
    )
    if not checks["version_compatibility"]:
        warnings.append("Patch still leaves high-severity migration issues.")

    valid = not errors
    log_audit_event(
        "REPORT_VALIDATE",
        sender_id,
        "ir.actions.report",
        {"report_xmlid": report_xmlid, "valid": valid, "errors": len(errors)},
    )
    return build_success_response(
        "reports.validate_patch",
        valid=valid,
        checks=checks,
        warnings=warnings,
        errors=errors,
    )


def preview_view_patch(
    client: OdooClient,
    sender_id: int,
    base_view_xmlid: str,
    patch: dict[str, Any],
    diff_format: str = "unified",
) -> dict[str, Any]:
    view_response = get_view_by_xmlid(
        client, sender_id, base_view_xmlid, include_inherited_chain=False
    )
    if not view_response.get("ok"):
        return view_response

    before = view_response["view"].get("arch_db") or ""
    after = _apply_advisory_patch(before, patch)
    if diff_format == "unified":
        diff = "\n".join(
            difflib.unified_diff(
                before.splitlines(),
                after.splitlines(),
                fromfile="before.xml",
                tofile="after.xml",
                lineterm="",
            )
        )
    else:
        diff = ""

    log_audit_event(
        "VIEW_PREVIEW",
        sender_id,
        "ir.ui.view",
        {"base_view_xmlid": base_view_xmlid, "diff_format": diff_format},
    )
    return build_success_response(
        "views.preview_patch",
        preview={
            "before": before,
            "after": after,
            "diff": diff,
            "changed_nodes": len(patch.get("operations", [])),
        },
    )


def test_view_compilation(
    client: OdooClient,
    sender_id: int,
    view_xmlid: str,
    context: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    view_response = get_view_by_xmlid(
        client, sender_id, view_xmlid, include_inherited_chain=False
    )
    if not view_response.get("ok"):
        return view_response

    view = view_response["view"]
    view_id = view.get("id")
    arch_text = view.get("arch_db") or ""

    xml_ok, xml_error = _is_well_formed_xml(arch_text)
    if not xml_ok:
        return {
            "ok": True,
            "status": "ok",
            "capability": "views.test_compilation",
            "compiles": False,
            "errors": [xml_error],
        }

    # best-effort compile check using fields_view_get under caller context
    try:
        client.call_kw(
            "ir.ui.view",
            "fields_view_get",
            args=[],
            kwargs={
                "view_id": view_id,
                "view_type": view.get("type") or "form",
                "context": context or {},
            },
            sender_id=sender_id,
        )
        errors: list[str] = []
        compiles = True
    except Exception as exc:  # pragma: no cover - backend-dependent
        errors = [str(exc)]
        compiles = False

    log_audit_event(
        "VIEW_COMPILE_TEST",
        sender_id,
        "ir.ui.view",
        {"view_xmlid": view_xmlid, "view_id": view_id, "compiles": compiles},
    )
    return build_success_response(
        "views.test_compilation",
        compiles=compiles,
        errors=errors,
    )


def apply_view_patch_safe(
    client: OdooClient,
    sender_id: int,
    base_view_xmlid: str,
    patch: dict[str, Any],
    *,
    strict: bool = True,
    confirm: bool = False,
    dry_run: bool = False,
    inherited_view_name: Optional[str] = None,
    priority: int = 90,
) -> dict[str, Any]:
    view_response = get_view_by_xmlid(
        client, sender_id, base_view_xmlid, include_inherited_chain=False
    )
    if not view_response.get("ok"):
        return view_response

    base_view = view_response["view"]
    checks, warnings, errors = _validate_xml_inheritance_patch(
        base_view.get("arch_db") or "", patch, strict=strict
    )
    if errors:
        return {
            "ok": False,
            "status": "validation_failed",
            "capability": "views.apply_patch_safe",
            "message": "Patch validation failed. Resolve errors before apply.",
            "checks": checks,
            "warnings": warnings,
            "errors": errors,
        }

    inherited_arch = _build_inheritance_arch_from_patch(patch)
    xml_ok, xml_error = _is_well_formed_xml(inherited_arch)
    if not xml_ok:
        return {
            "ok": False,
            "status": "validation_failed",
            "capability": "views.apply_patch_safe",
            "message": "Generated inherited XML is not well formed.",
            "errors": [xml_error],
        }

    create_vals = {
        "name": inherited_view_name
        or f"mcp.patch.{base_view.get('name') or base_view_xmlid}",
        "type": base_view.get("type") or "form",
        "model": base_view.get("model"),
        "inherit_id": int(base_view.get("id")),
        "mode": "extension",
        "priority": int(priority),
        "arch_db": inherited_arch,
        "active": True,
    }

    preview_snapshot = _build_apply_snapshot(
        kind="view",
        created_view_id=0,
        base_xmlid=base_view_xmlid,
        patch=patch,
    )

    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": "views.apply_patch_safe",
            "message": "Set confirm=true to create inherited view patch safely.",
            "plan": {
                "action": "create_inherited_view",
                "base_view_id": base_view.get("id"),
                "base_view_xmlid": base_view_xmlid,
                "values": create_vals,
            },
            "snapshot": preview_snapshot,
        }

    if dry_run:
        log_audit_event(
            "VIEW_APPLY_DRY_RUN",
            sender_id,
            "ir.ui.view",
            {
                "base_view_xmlid": base_view_xmlid,
                "operations": len(patch.get("operations", [])),
            },
        )
        return build_success_response(
            "views.apply_patch_safe",
            applied=False,
            dry_run=True,
            plan={
                "action": "create_inherited_view",
                "base_view_id": base_view.get("id"),
                "values": create_vals,
            },
            snapshot=preview_snapshot,
        )

    created_view_id = client.call_kw(
        "ir.ui.view",
        "create",
        args=[create_vals],
        kwargs={},
        sender_id=sender_id,
    )

    snapshot = _build_apply_snapshot(
        kind="view",
        created_view_id=int(created_view_id),
        base_xmlid=base_view_xmlid,
        patch=patch,
    )
    log_audit_event(
        "VIEW_APPLY",
        sender_id,
        "ir.ui.view",
        {
            "base_view_xmlid": base_view_xmlid,
            "base_view_id": base_view.get("id"),
            "created_view_id": created_view_id,
            "operations": len(patch.get("operations", [])),
        },
    )
    return build_success_response(
        "views.apply_patch_safe",
        applied=True,
        created_view_id=created_view_id,
        snapshot=snapshot,
    )


def apply_report_patch_safe(
    client: OdooClient,
    sender_id: int,
    report_xmlid: str,
    patch: dict[str, Any],
    *,
    strict: bool = True,
    confirm: bool = False,
    dry_run: bool = False,
    inherited_view_name: Optional[str] = None,
    priority: int = 90,
) -> dict[str, Any]:
    report_response = get_report_template(client, sender_id, report_xmlid)
    if not report_response.get("ok"):
        return report_response

    template = report_response.get("template")
    if not template:
        return {
            "ok": False,
            "status": "not_found",
            "capability": "reports.apply_patch_safe",
            "message": "No primary QWeb template found for report xmlid.",
        }

    checks, warnings, errors = _validate_xml_inheritance_patch(
        template.get("arch_db") or "", patch, strict=strict
    )
    if errors:
        return {
            "ok": False,
            "status": "validation_failed",
            "capability": "reports.apply_patch_safe",
            "message": "Patch validation failed. Resolve errors before apply.",
            "checks": checks,
            "warnings": warnings,
            "errors": errors,
        }

    inherited_arch = _build_inheritance_arch_from_patch(patch)
    xml_ok, xml_error = _is_well_formed_xml(inherited_arch)
    if not xml_ok:
        return {
            "ok": False,
            "status": "validation_failed",
            "capability": "reports.apply_patch_safe",
            "message": "Generated inherited XML is not well formed.",
            "errors": [xml_error],
        }

    report = report_response.get("report") or {}
    create_vals = {
        "name": inherited_view_name
        or f"mcp.patch.{report.get('name') or report_xmlid}",
        "type": "qweb",
        "inherit_id": int(template.get("id")),
        "mode": "extension",
        "priority": int(priority),
        "arch_db": inherited_arch,
        "active": True,
    }

    preview_snapshot = _build_apply_snapshot(
        kind="report",
        created_view_id=0,
        base_xmlid=report_xmlid,
        patch=patch,
    )

    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": "reports.apply_patch_safe",
            "message": "Set confirm=true to create inherited report template patch safely.",
            "plan": {
                "action": "create_inherited_report_template",
                "report_xmlid": report_xmlid,
                "template_id": template.get("id"),
                "values": create_vals,
            },
            "snapshot": preview_snapshot,
        }

    if dry_run:
        log_audit_event(
            "REPORT_APPLY_DRY_RUN",
            sender_id,
            "ir.actions.report",
            {
                "report_xmlid": report_xmlid,
                "operations": len(patch.get("operations", [])),
            },
        )
        return build_success_response(
            "reports.apply_patch_safe",
            applied=False,
            dry_run=True,
            plan={
                "action": "create_inherited_report_template",
                "template_id": template.get("id"),
                "values": create_vals,
            },
            snapshot=preview_snapshot,
        )

    created_view_id = client.call_kw(
        "ir.ui.view",
        "create",
        args=[create_vals],
        kwargs={},
        sender_id=sender_id,
    )

    snapshot = _build_apply_snapshot(
        kind="report",
        created_view_id=int(created_view_id),
        base_xmlid=report_xmlid,
        patch=patch,
    )
    log_audit_event(
        "REPORT_APPLY",
        sender_id,
        "ir.actions.report",
        {
            "report_xmlid": report_xmlid,
            "template_id": template.get("id"),
            "created_view_id": created_view_id,
            "operations": len(patch.get("operations", [])),
        },
    )
    return build_success_response(
        "reports.apply_patch_safe",
        applied=True,
        created_view_id=created_view_id,
        snapshot=snapshot,
    )


def rollback_patch_safe(
    client: OdooClient,
    sender_id: int,
    snapshot: dict[str, Any],
    *,
    confirm: bool = False,
    dry_run: bool = False,
) -> dict[str, Any]:
    rollback_action = snapshot.get("rollback_action")
    created_view_id = snapshot.get("created_view_id")

    if rollback_action != "deactivate_created_view" or not created_view_id:
        return {
            "ok": False,
            "status": "invalid_snapshot",
            "capability": "views.rollback_patch_safe",
            "message": "Snapshot is missing a valid rollback action.",
        }

    if not confirm:
        return {
            "ok": False,
            "status": "confirmation_required",
            "capability": "views.rollback_patch_safe",
            "message": "Set confirm=true to deactivate created inherited view.",
            "rollback_action": rollback_action,
            "created_view_id": created_view_id,
            "dry_run": dry_run,
        }

    if dry_run:
        return build_success_response(
            "views.rollback_patch_safe",
            rolled_back=False,
            dry_run=True,
            rollback_action=rollback_action,
            created_view_id=created_view_id,
        )

    client.call_kw(
        "ir.ui.view",
        "write",
        args=[[int(created_view_id)], {"active": False}],
        kwargs={},
        sender_id=sender_id,
    )

    log_audit_event(
        "VIEW_ROLLBACK",
        sender_id,
        "ir.ui.view",
        {
            "snapshot_id": snapshot.get("snapshot_id"),
            "created_view_id": created_view_id,
            "kind": snapshot.get("kind"),
        },
    )
    return build_success_response(
        "views.rollback_patch_safe",
        rolled_back=True,
        rollback_action=rollback_action,
        created_view_id=created_view_id,
    )


def preview_report_patch(
    client: OdooClient,
    sender_id: int,
    report_xmlid: str,
    patch: dict[str, Any],
    diff_format: str = "unified",
) -> dict[str, Any]:
    report_response = get_report_template(client, sender_id, report_xmlid)
    if not report_response.get("ok"):
        return report_response

    template = report_response.get("template") or {}
    before = template.get("arch_db") or ""
    after = _apply_advisory_patch(before, patch)
    diff = ""
    if diff_format == "unified":
        diff = "\n".join(
            difflib.unified_diff(
                before.splitlines(),
                after.splitlines(),
                fromfile="before.xml",
                tofile="after.xml",
                lineterm="",
            )
        )

    log_audit_event(
        "REPORT_PREVIEW",
        sender_id,
        "ir.actions.report",
        {"report_xmlid": report_xmlid, "diff_format": diff_format},
    )
    return build_success_response(
        "reports.preview_patch",
        preview={
            "before": before,
            "after": after,
            "diff": diff,
            "changed_nodes": len(patch.get("operations", [])),
        },
    )


def _build_pr_ready_bundle(
    *,
    kind: str,
    xmlid: str,
    target_version: str,
    summary: dict[str, int],
    validation: dict[str, Any],
    risk_level: str,
) -> dict[str, Any]:
    high = summary.get("high", 0)
    medium = summary.get("medium", 0)
    low = summary.get("low", 0)
    valid = bool(validation.get("valid"))

    checklist = [
        {"item": "Scan migration issues", "done": True},
        {"item": "Generate advisory patch", "done": True},
        {"item": "Validate patch", "done": True},
        {"item": "Human review", "done": False},
        {"item": "Apply safe patch", "done": False},
    ]

    markdown = "\n".join(
        [
            f"# Migration Assistant Report ({kind})",
            f"- XMLID: `{xmlid}`",
            f"- Target: `{target_version}`",
            f"- Risk: `{risk_level}`",
            f"- Validation: `{'valid' if valid else 'invalid'}`",
            "",
            "## Issues",
            f"- High: {high}",
            f"- Medium: {medium}",
            f"- Low: {low}",
            "",
            "## Next Steps",
            "1. Review advisory operations and XPath targets.",
            "2. Convert advisory patch to xml_inheritance if apply is required.",
            "3. Execute apply_safe with confirm=true in controlled environment.",
        ]
    )

    return {
        "title": f"{kind} migration bundle for {xmlid}",
        "checklist": checklist,
        "markdown_report": markdown,
    }


def assist_view_migration(
    client: OdooClient,
    sender_id: int,
    xmlid: str,
    target_version: str = "18.0",
    intent: str = "migrate",
    constraints: Optional[dict[str, Any]] = None,
    strict: bool = True,
    include_compile_test: bool = True,
) -> dict[str, Any]:
    scan = scan_view_migration_issues(
        client,
        sender_id,
        xmlid=xmlid,
        target_version=target_version,
    )
    if not scan.get("ok"):
        return scan

    proposal = propose_view_patch(
        client,
        sender_id,
        xmlid=xmlid,
        intent=intent,
        constraints=constraints,
    )
    if not proposal.get("ok"):
        return proposal

    patch = proposal.get("proposal") or {}
    validation = validate_view_patch(
        client,
        sender_id,
        base_view_xmlid=xmlid,
        patch=patch,
        strict=strict,
        target_version=target_version,
    )
    preview = preview_view_patch(
        client,
        sender_id,
        base_view_xmlid=xmlid,
        patch=patch,
    )
    compilation = (
        test_view_compilation(client, sender_id, view_xmlid=xmlid)
        if include_compile_test
        else None
    )

    risk_level = proposal.get("risk_level", "medium")
    bundle = _build_pr_ready_bundle(
        kind="view",
        xmlid=xmlid,
        target_version=target_version,
        summary=scan.get("summary") or {},
        validation=validation,
        risk_level=risk_level,
    )
    log_audit_event(
        "VIEW_ASSIST",
        sender_id,
        "ir.ui.view",
        {
            "xmlid": xmlid,
            "target_version": target_version,
            "risk_level": risk_level,
        },
    )
    return build_success_response(
        "views.assist_migration",
        xmlid=xmlid,
        target_version=target_version,
        scan=scan,
        proposal=proposal,
        validation=validation,
        preview=preview,
        compilation=compilation,
        pr_bundle=bundle,
    )


def assist_report_migration(
    client: OdooClient,
    sender_id: int,
    xmlid: str,
    target_version: str = "18.0",
    intent: str = "migrate",
    constraints: Optional[dict[str, Any]] = None,
    strict: bool = True,
) -> dict[str, Any]:
    scan = scan_report_migration_issues(
        client,
        sender_id,
        xmlid=xmlid,
        target_version=target_version,
    )
    if not scan.get("ok"):
        return scan

    proposal = propose_report_patch(
        client,
        sender_id,
        xmlid=xmlid,
        intent=intent,
        constraints=constraints,
    )
    if not proposal.get("ok"):
        return proposal

    patch = proposal.get("proposal") or {}
    validation = validate_report_patch(
        client,
        sender_id,
        report_xmlid=xmlid,
        patch=patch,
        strict=strict,
        target_version=target_version,
    )
    preview = preview_report_patch(
        client,
        sender_id,
        report_xmlid=xmlid,
        patch=patch,
    )

    risk_level = proposal.get("risk_level", "medium")
    bundle = _build_pr_ready_bundle(
        kind="report",
        xmlid=xmlid,
        target_version=target_version,
        summary=scan.get("summary") or {},
        validation=validation,
        risk_level=risk_level,
    )
    log_audit_event(
        "REPORT_ASSIST",
        sender_id,
        "ir.actions.report",
        {
            "xmlid": xmlid,
            "target_version": target_version,
            "risk_level": risk_level,
        },
    )
    return build_success_response(
        "reports.assist_migration",
        xmlid=xmlid,
        target_version=target_version,
        scan=scan,
        proposal=proposal,
        validation=validation,
        preview=preview,
        pr_bundle=bundle,
    )


def _build_visual_preview(
    before: str,
    after: str,
    diff_text: str,
) -> dict[str, Any]:
    added_lines = 0
    removed_lines = 0
    for line in diff_text.splitlines():
        if line.startswith("+++") or line.startswith("---"):
            continue
        if line.startswith("+"):
            added_lines += 1
        elif line.startswith("-"):
            removed_lines += 1

    return {
        "added_lines": added_lines,
        "removed_lines": removed_lines,
        "changed_lines": added_lines + removed_lines,
        "before_excerpt": "\n".join(before.splitlines()[:25]),
        "after_excerpt": "\n".join(after.splitlines()[:25]),
        "summary_markdown": "\n".join(
            [
                "## Visual Patch Summary",
                f"- Added lines: {added_lines}",
                f"- Removed lines: {removed_lines}",
                f"- Total changed lines: {added_lines + removed_lines}",
            ]
        ),
    }


def visualize_view_patch(
    client: OdooClient,
    sender_id: int,
    base_view_xmlid: str,
    patch: dict[str, Any],
    diff_format: str = "unified",
) -> dict[str, Any]:
    preview = preview_view_patch(
        client,
        sender_id,
        base_view_xmlid=base_view_xmlid,
        patch=patch,
        diff_format=diff_format,
    )
    if not preview.get("ok"):
        return preview

    preview_payload = preview.get("preview") or {}
    before = preview_payload.get("before") or ""
    after = preview_payload.get("after") or ""
    diff_text = preview_payload.get("diff") or ""
    visual = _build_visual_preview(before, after, diff_text)

    log_audit_event(
        "VIEW_VISUAL_PREVIEW",
        sender_id,
        "ir.ui.view",
        {"xmlid": base_view_xmlid, "diff_format": diff_format},
    )
    return build_success_response(
        "views.visualize_patch",
        preview=preview_payload,
        visual=visual,
    )


def visualize_report_patch(
    client: OdooClient,
    sender_id: int,
    report_xmlid: str,
    patch: dict[str, Any],
    diff_format: str = "unified",
) -> dict[str, Any]:
    preview = preview_report_patch(
        client,
        sender_id,
        report_xmlid=report_xmlid,
        patch=patch,
        diff_format=diff_format,
    )
    if not preview.get("ok"):
        return preview

    preview_payload = preview.get("preview") or {}
    before = preview_payload.get("before") or ""
    after = preview_payload.get("after") or ""
    diff_text = preview_payload.get("diff") or ""
    visual = _build_visual_preview(before, after, diff_text)

    log_audit_event(
        "REPORT_VISUAL_PREVIEW",
        sender_id,
        "ir.actions.report",
        {"xmlid": report_xmlid, "diff_format": diff_format},
    )
    return build_success_response(
        "reports.visualize_patch",
        preview=preview_payload,
        visual=visual,
    )


def batch_assist_view_migration(
    client: OdooClient,
    sender_id: int,
    xmlids: list[str],
    target_version: str = "18.0",
    intent: str = "migrate",
    constraints: Optional[dict[str, Any]] = None,
    strict: bool = True,
    include_compile_test: bool = False,
    continue_on_error: bool = True,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    aggregate = {"high": 0, "medium": 0, "low": 0}

    for xmlid in xmlids:
        item = assist_view_migration(
            client,
            sender_id,
            xmlid=xmlid,
            target_version=target_version,
            intent=intent,
            constraints=constraints,
            strict=strict,
            include_compile_test=include_compile_test,
        )
        if item.get("ok"):
            results.append(item)
            scan_summary = (item.get("scan") or {}).get("summary") or {}
            for severity in aggregate:
                aggregate[severity] += int(scan_summary.get(severity, 0))
            continue

        failed.append(
            {
                "xmlid": xmlid,
                "status": item.get("status", "error"),
                "message": item.get("message", "Batch item failed"),
            }
        )
        if not continue_on_error:
            break

    log_audit_event(
        "VIEW_BATCH_ASSIST",
        sender_id,
        "ir.ui.view",
        {
            "total": len(xmlids),
            "succeeded": len(results),
            "failed": len(failed),
            "continue_on_error": continue_on_error,
        },
    )
    return build_success_response(
        "views.batch_assist_migration",
        total=len(xmlids),
        succeeded=len(results),
        failed=len(failed),
        continue_on_error=continue_on_error,
        summary=aggregate,
        results=results,
        failures=failed,
    )


def batch_assist_report_migration(
    client: OdooClient,
    sender_id: int,
    xmlids: list[str],
    target_version: str = "18.0",
    intent: str = "migrate",
    constraints: Optional[dict[str, Any]] = None,
    strict: bool = True,
    continue_on_error: bool = True,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    aggregate = {"high": 0, "medium": 0, "low": 0}

    for xmlid in xmlids:
        item = assist_report_migration(
            client,
            sender_id,
            xmlid=xmlid,
            target_version=target_version,
            intent=intent,
            constraints=constraints,
            strict=strict,
        )
        if item.get("ok"):
            results.append(item)
            scan_summary = (item.get("scan") or {}).get("summary") or {}
            for severity in aggregate:
                aggregate[severity] += int(scan_summary.get(severity, 0))
            continue

        failed.append(
            {
                "xmlid": xmlid,
                "status": item.get("status", "error"),
                "message": item.get("message", "Batch item failed"),
            }
        )
        if not continue_on_error:
            break

    log_audit_event(
        "REPORT_BATCH_ASSIST",
        sender_id,
        "ir.actions.report",
        {
            "total": len(xmlids),
            "succeeded": len(results),
            "failed": len(failed),
            "continue_on_error": continue_on_error,
        },
    )
    return build_success_response(
        "reports.batch_assist_migration",
        total=len(xmlids),
        succeeded=len(results),
        failed=len(failed),
        continue_on_error=continue_on_error,
        summary=aggregate,
        results=results,
        failures=failed,
    )
