from unittest.mock import MagicMock

import pytest

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.view_migration_service import (
    get_view_by_xmlid,
    scan_view_migration_issues,
    propose_view_patch,
    validate_view_patch,
    preview_view_patch,
    preview_report_patch,
    apply_view_patch_safe,
    apply_report_patch_safe,
    rollback_patch_safe,
    assist_view_migration,
    assist_report_migration,
    visualize_view_patch,
    visualize_report_patch,
    batch_assist_view_migration,
    batch_assist_report_migration,
)
import odoo_mcp.services.view_migration_service as view_migration_service


@pytest.fixture
def mock_client() -> MagicMock:
    client = MagicMock(spec=OdooClient)
    client.model_exists.return_value = True
    return client


def _mock_view_resolution(
    mock_client: MagicMock, arch_db: str = "<tree><field name='name'/></tree>"
) -> None:
    mock_client.call_kw.side_effect = [
        [
            {
                "id": 1,
                "model": "ir.ui.view",
                "res_id": 77,
                "module": "sale",
                "name": "view_order_tree",
            }
        ],
        [
            {
                "id": 77,
                "name": "sale.order.tree",
                "model": "sale.order",
                "type": "tree",
                "inherit_id": False,
                "priority": 16,
                "arch_db": arch_db,
                "key": "sale.view_order_tree",
                "active": True,
            }
        ],
        [],
    ]


def test_get_view_by_xmlid_returns_view_payload(mock_client: MagicMock) -> None:
    _mock_view_resolution(mock_client)

    result = get_view_by_xmlid(mock_client, sender_id=9, xmlid="sale.view_order_tree")

    assert result["ok"] is True
    assert result["view"]["id"] == 77
    assert result["view"]["xmlid"] == "sale.view_order_tree"


def test_scan_view_migration_issues_detects_tree_to_list(
    mock_client: MagicMock,
) -> None:
    _mock_view_resolution(mock_client, arch_db="<tree string='Orders'></tree>")

    result = scan_view_migration_issues(
        mock_client,
        sender_id=9,
        xmlid="sale.view_order_tree",
        target_version="18.0",
    )

    assert result["ok"] is True
    assert any(issue["rule_id"] == "TREE_TO_LIST" for issue in result["issues"])
    assert result["summary"]["high"] >= 1


def test_propose_view_patch_returns_advisory_patch(mock_client: MagicMock) -> None:
    base_sequence = [
        [
            {
                "id": 1,
                "model": "ir.ui.view",
                "res_id": 77,
                "module": "sale",
                "name": "view_order_tree",
            }
        ],
        [
            {
                "id": 77,
                "name": "sale.order.tree",
                "model": "sale.order",
                "type": "tree",
                "inherit_id": False,
                "priority": 16,
                "arch_db": "<tree><field name='name'/></tree>",
                "key": "sale.view_order_tree",
                "active": True,
            }
        ],
        [],
    ]
    mock_client.call_kw.side_effect = base_sequence + base_sequence

    result = propose_view_patch(
        mock_client,
        sender_id=9,
        xmlid="sale.view_order_tree",
        intent="migrate_to_18",
        constraints={"deny_base_overwrite": True},
    )

    assert result["ok"] is True
    assert result["proposal"]["patch_format"] == "advisory_patch"
    assert "<list" in result["proposal"]["result_arch_preview"]


def test_validate_view_patch_fails_when_xpath_matches_nothing(
    mock_client: MagicMock,
) -> None:
    _mock_view_resolution(mock_client, arch_db="<form><field name='name'/></form>")

    result = validate_view_patch(
        mock_client,
        sender_id=9,
        base_view_xmlid="sale.view_order_form",
        patch={
            "patch_format": "xml_inheritance",
            "operations": [
                {"xpath": "//field[@name='state']", "position": "attributes"}
            ],
        },
        strict=True,
        target_version="18.0",
    )

    assert result["ok"] is True
    assert result["valid"] is False
    assert any("did not match any nodes" in err for err in result["errors"])


def test_preview_view_patch_returns_unified_diff(mock_client: MagicMock) -> None:
    _mock_view_resolution(mock_client, arch_db="<tree><field name='name'/></tree>")

    result = preview_view_patch(
        mock_client,
        sender_id=9,
        base_view_xmlid="sale.view_order_tree",
        patch={
            "patch_format": "advisory_patch",
            "operations": [{"type": "replace_tag", "from": "tree", "to": "list"}],
            "replacements": [
                {"from": "<tree", "to": "<list"},
                {"from": "</tree>", "to": "</list>"},
            ],
        },
    )

    assert result["ok"] is True
    assert "--- before.xml" in result["preview"]["diff"]
    assert "+++ after.xml" in result["preview"]["diff"]


def test_apply_view_patch_safe_requires_confirmation(mock_client: MagicMock) -> None:
    mock_client.call_kw.side_effect = [
        [
            {
                "id": 1,
                "model": "ir.ui.view",
                "res_id": 88,
                "module": "sale",
                "name": "view_order_form",
            }
        ],
        [
            {
                "id": 88,
                "name": "sale.order.form",
                "model": "sale.order",
                "type": "form",
                "inherit_id": False,
                "priority": 16,
                "arch_db": "<form><field name='name'/></form>",
                "key": "sale.view_order_form",
                "active": True,
            }
        ],
    ]

    result = apply_view_patch_safe(
        mock_client,
        sender_id=9,
        base_view_xmlid="sale.view_order_form",
        patch={
            "patch_format": "xml_inheritance",
            "operations": [
                {
                    "xpath": "//field[@name='name']",
                    "position": "attributes",
                    "attributes": {"string": "Order Name"},
                }
            ],
        },
        strict=True,
        confirm=False,
    )

    assert result["ok"] is False
    assert result["status"] == "confirmation_required"


def test_apply_view_patch_safe_dry_run_returns_plan(mock_client: MagicMock) -> None:
    mock_client.call_kw.side_effect = [
        [
            {
                "id": 1,
                "model": "ir.ui.view",
                "res_id": 88,
                "module": "sale",
                "name": "view_order_form",
            }
        ],
        [
            {
                "id": 88,
                "name": "sale.order.form",
                "model": "sale.order",
                "type": "form",
                "inherit_id": False,
                "priority": 16,
                "arch_db": "<form><field name='name'/></form>",
                "key": "sale.view_order_form",
                "active": True,
            }
        ],
    ]

    result = apply_view_patch_safe(
        mock_client,
        sender_id=9,
        base_view_xmlid="sale.view_order_form",
        patch={
            "patch_format": "xml_inheritance",
            "operations": [
                {
                    "xpath": "//field[@name='name']",
                    "position": "attributes",
                    "attributes": {"string": "Order Name"},
                }
            ],
        },
        strict=True,
        confirm=True,
        dry_run=True,
    )

    assert result["ok"] is True
    assert result["applied"] is False
    assert result["dry_run"] is True
    assert result["plan"]["action"] == "create_inherited_view"


def test_apply_view_patch_safe_and_rollback_deactivate_created_view(
    mock_client: MagicMock,
) -> None:
    mock_client.call_kw.side_effect = [
        [
            {
                "id": 1,
                "model": "ir.ui.view",
                "res_id": 88,
                "module": "sale",
                "name": "view_order_form",
            }
        ],
        [
            {
                "id": 88,
                "name": "sale.order.form",
                "model": "sale.order",
                "type": "form",
                "inherit_id": False,
                "priority": 16,
                "arch_db": "<form><field name='name'/></form>",
                "key": "sale.view_order_form",
                "active": True,
            }
        ],
        999,
        True,
    ]

    applied = apply_view_patch_safe(
        mock_client,
        sender_id=9,
        base_view_xmlid="sale.view_order_form",
        patch={
            "patch_format": "xml_inheritance",
            "operations": [
                {
                    "xpath": "//field[@name='name']",
                    "position": "attributes",
                    "attributes": {"string": "Order Name"},
                }
            ],
        },
        strict=True,
        confirm=True,
        dry_run=False,
    )

    assert applied["ok"] is True
    assert applied["applied"] is True
    assert applied["created_view_id"] == 999

    rollback = rollback_patch_safe(
        mock_client,
        sender_id=9,
        snapshot=applied["snapshot"],
        confirm=True,
    )
    assert rollback["ok"] is True
    assert rollback["rolled_back"] is True


def test_apply_report_patch_safe_dry_run_returns_plan(mock_client: MagicMock) -> None:
    mock_client.call_kw.side_effect = [
        [
            {
                "id": 11,
                "model": "ir.actions.report",
                "res_id": 44,
                "module": "sale",
                "name": "action_report_saleorder",
            }
        ],
        [
            {
                "id": 44,
                "name": "Sale Order",
                "model": "sale.order",
                "report_name": "sale.report_saleorder_document",
                "report_type": "qweb-pdf",
                "binding_model_id": [1, "sale.order"],
            }
        ],
        [
            {
                "id": 300,
                "name": "sale.report_saleorder_document",
                "key": "sale.report_saleorder_document",
                "type": "qweb",
                "arch_db": "<template><t t-name='sale.report_saleorder_document'><div class='page'/></t></template>",
                "inherit_id": False,
            }
        ],
    ]

    result = apply_report_patch_safe(
        mock_client,
        sender_id=9,
        report_xmlid="sale.action_report_saleorder",
        patch={
            "patch_format": "xml_inheritance",
            "operations": [
                {
                    "xpath": "//div[@class='page']",
                    "position": "inside",
                    "content": "<span>patched</span>",
                }
            ],
        },
        strict=True,
        confirm=True,
        dry_run=True,
    )

    assert result["ok"] is True
    assert result["applied"] is False
    assert result["dry_run"] is True
    assert result["plan"]["action"] == "create_inherited_report_template"


def test_preview_report_patch_returns_unified_diff(mock_client: MagicMock) -> None:
    mock_client.call_kw.side_effect = [
        [
            {
                "id": 11,
                "model": "ir.actions.report",
                "res_id": 44,
                "module": "sale",
                "name": "action_report_saleorder",
            }
        ],
        [
            {
                "id": 44,
                "name": "Sale Order",
                "model": "sale.order",
                "report_name": "sale.report_saleorder_document",
                "report_type": "qweb-pdf",
                "binding_model_id": [1, "sale.order"],
            }
        ],
        [
            {
                "id": 300,
                "name": "sale.report_saleorder_document",
                "key": "sale.report_saleorder_document",
                "type": "qweb",
                "arch_db": "<template><div class='page'></div></template>",
                "inherit_id": False,
            }
        ],
    ]

    result = preview_report_patch(
        mock_client,
        sender_id=9,
        report_xmlid="sale.action_report_saleorder",
        patch={
            "patch_format": "advisory_patch",
            "operations": [{"type": "replace_tag", "from": "div", "to": "section"}],
            "replacements": [
                {"from": "<div", "to": "<section"},
                {"from": "</div>", "to": "</section>"},
            ],
        },
    )

    assert result["ok"] is True
    assert "--- before.xml" in result["preview"]["diff"]


def test_assist_view_migration_returns_pr_bundle(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        view_migration_service,
        "scan_view_migration_issues",
        lambda *_args, **_kwargs: {
            "ok": True,
            "summary": {"high": 1, "medium": 0, "low": 0},
            "issues": [{"rule_id": "TREE_TO_LIST", "severity": "high"}],
        },
    )
    monkeypatch.setattr(
        view_migration_service,
        "propose_view_patch",
        lambda *_args, **_kwargs: {
            "ok": True,
            "risk_level": "medium",
            "proposal": {"patch_format": "advisory_patch", "operations": []},
        },
    )
    monkeypatch.setattr(
        view_migration_service,
        "validate_view_patch",
        lambda *_args, **_kwargs: {
            "ok": True,
            "valid": True,
            "warnings": [],
            "errors": [],
        },
    )
    monkeypatch.setattr(
        view_migration_service,
        "preview_view_patch",
        lambda *_args, **_kwargs: {
            "ok": True,
            "preview": {"diff": "--- before.xml\n+++ after.xml"},
        },
    )
    monkeypatch.setattr(
        view_migration_service,
        "test_view_compilation",
        lambda *_args, **_kwargs: {"ok": True, "compiles": True, "errors": []},
    )

    result = assist_view_migration(
        MagicMock(spec=OdooClient),
        sender_id=9,
        xmlid="sale.view_order_tree",
    )

    assert result["ok"] is True
    assert "pr_bundle" in result
    assert "markdown_report" in result["pr_bundle"]


def test_assist_report_migration_returns_pr_bundle(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        view_migration_service,
        "scan_report_migration_issues",
        lambda *_args, **_kwargs: {
            "ok": True,
            "summary": {"high": 0, "medium": 1, "low": 0},
            "issues": [{"rule_id": "QWEB_T_RAW", "severity": "medium"}],
        },
    )
    monkeypatch.setattr(
        view_migration_service,
        "propose_report_patch",
        lambda *_args, **_kwargs: {
            "ok": True,
            "risk_level": "low",
            "proposal": {"patch_format": "advisory_patch", "operations": []},
        },
    )
    monkeypatch.setattr(
        view_migration_service,
        "validate_report_patch",
        lambda *_args, **_kwargs: {
            "ok": True,
            "valid": True,
            "warnings": [],
            "errors": [],
        },
    )
    monkeypatch.setattr(
        view_migration_service,
        "preview_report_patch",
        lambda *_args, **_kwargs: {
            "ok": True,
            "preview": {"diff": "--- before.xml\n+++ after.xml"},
        },
    )

    result = assist_report_migration(
        MagicMock(spec=OdooClient),
        sender_id=9,
        xmlid="sale.action_report_saleorder",
    )

    assert result["ok"] is True
    assert "pr_bundle" in result
    assert "markdown_report" in result["pr_bundle"]


def test_visualize_view_patch_returns_visual_summary(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        view_migration_service,
        "preview_view_patch",
        lambda *_args, **_kwargs: {
            "ok": True,
            "preview": {
                "before": "<tree>\n<field name='name'/>\n</tree>",
                "after": "<list>\n<field name='name'/>\n</list>",
                "diff": "--- before.xml\n+++ after.xml\n-<tree>\n+<list>",
            },
        },
    )

    result = visualize_view_patch(
        MagicMock(spec=OdooClient),
        sender_id=9,
        base_view_xmlid="sale.view_order_tree",
        patch={"patch_format": "advisory_patch", "operations": []},
    )

    assert result["ok"] is True
    assert result["visual"]["added_lines"] == 1
    assert result["visual"]["removed_lines"] == 1


def test_visualize_report_patch_returns_visual_summary(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        view_migration_service,
        "preview_report_patch",
        lambda *_args, **_kwargs: {
            "ok": True,
            "preview": {
                "before": "<template>\n<div/>\n</template>",
                "after": "<template>\n<section/>\n</template>",
                "diff": "--- before.xml\n+++ after.xml\n-<div/>\n+<section/>",
            },
        },
    )

    result = visualize_report_patch(
        MagicMock(spec=OdooClient),
        sender_id=9,
        report_xmlid="sale.action_report_saleorder",
        patch={"patch_format": "advisory_patch", "operations": []},
    )

    assert result["ok"] is True
    assert result["visual"]["changed_lines"] == 2


def test_batch_assist_view_migration_aggregates_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    outcomes = {
        "sale.view_ok": {
            "ok": True,
            "scan": {"summary": {"high": 1, "medium": 0, "low": 0}},
        },
        "sale.view_fail": {
            "ok": False,
            "status": "not_found",
            "message": "Missing xmlid",
        },
    }

    monkeypatch.setattr(
        view_migration_service,
        "assist_view_migration",
        lambda _client, _sender_id, xmlid, **_kwargs: outcomes[xmlid],
    )

    result = batch_assist_view_migration(
        MagicMock(spec=OdooClient),
        sender_id=9,
        xmlids=["sale.view_ok", "sale.view_fail"],
        continue_on_error=True,
    )

    assert result["ok"] is True
    assert result["succeeded"] == 1
    assert result["failed"] == 1
    assert result["summary"]["high"] == 1


def test_batch_assist_report_migration_stops_on_error_when_requested(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    outcomes = {
        "sale.report_fail": {
            "ok": False,
            "status": "not_found",
            "message": "Missing xmlid",
        },
        "sale.report_skipped": {
            "ok": True,
            "scan": {"summary": {"high": 0, "medium": 1, "low": 0}},
        },
    }

    monkeypatch.setattr(
        view_migration_service,
        "assist_report_migration",
        lambda _client, _sender_id, xmlid, **_kwargs: outcomes[xmlid],
    )

    result = batch_assist_report_migration(
        MagicMock(spec=OdooClient),
        sender_id=9,
        xmlids=["sale.report_fail", "sale.report_skipped"],
        continue_on_error=False,
    )

    assert result["ok"] is True
    assert result["succeeded"] == 0
    assert result["failed"] == 1
