from typing import Any, Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("project_service")


def find_task(
    client: OdooClient,
    user_id: int,
    name: Optional[str] = None,
    project_id: Optional[int] = None,
    stage_id: Optional[int] = None,
    limit: int = 10,
) -> list:
    domain: list[tuple[str, str, Any]] = []
    if name:
        domain.append(("name", "ilike", name))
    if project_id:
        domain.append(("project_id", "=", project_id))
    if stage_id:
        domain.append(("stage_id", "=", stage_id))

    _logger.info(f"Finding tasks with domain: {domain}")
    return client.call_kw(
        "project.task",
        "search_read",
        args=[domain],
        kwargs={
            "fields": ["id", "name", "project_id", "stage_id", "user_ids"],
            "limit": limit,
        },
        sender_id=user_id,
    )


def create_task(
    client: OdooClient,
    user_id: int,
    name: str,
    project_id: Optional[int] = None,
    description: Optional[str] = None,
    assigned_to: Optional[int] = None,
    deadline: Optional[str] = None,
) -> int:
    values: dict[str, Any] = {"name": name}
    if project_id:
        values["project_id"] = project_id
    if description:
        values["description"] = description
    if assigned_to:
        values["user_ids"] = [(4, assigned_to)]
    if deadline:
        values["date_deadline"] = deadline

    _logger.info(f"Creating task '{name}'")
    return client.call_kw("project.task", "create", args=[values], sender_id=user_id)


def update_task(
    client: OdooClient,
    user_id: int,
    task_id: int,
    stage_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    deadline: Optional[str] = None,
) -> bool:
    values: dict[str, Any] = {}
    if stage_id:
        values["stage_id"] = stage_id
    if assigned_to:
        values["user_ids"] = [(4, assigned_to)]
    if deadline:
        values["date_deadline"] = deadline

    if not values:
        return True

    _logger.info(f"Updating task {task_id} with {values}")
    return client.call_kw(
        "project.task", "write", args=[[task_id], values], sender_id=user_id
    )


def find_my_tasks(
    client: OdooClient,
    user_id: int,
    project_id: Optional[int] = None,
    state: Optional[str] = None,
    date_deadline_from: Optional[str] = None,
    date_deadline_to: Optional[str] = None,
    limit: int = 20,
) -> list:
    domain: list[tuple[str, str, Any]] = [("user_ids", "in", [user_id])]

    if project_id:
        domain.append(("project_id", "=", project_id))
    if state == "open":
        domain.append(("stage_id.fold", "=", False))
    if state == "closed":
        domain.append(("stage_id.fold", "=", True))
    if date_deadline_from:
        domain.append(("date_deadline", ">=", date_deadline_from))
    if date_deadline_to:
        domain.append(("date_deadline", "<=", date_deadline_to))

    _logger.info(f"Finding my tasks for user {user_id} with domain: {domain}")
    return client.call_kw(
        "project.task",
        "search_read",
        args=[domain],
        kwargs={
            "fields": [
                "id",
                "name",
                "project_id",
                "stage_id",
                "date_deadline",
                "user_ids",
                "priority",
            ],
            "limit": limit,
            "order": "priority desc, date_deadline asc, id desc",
        },
        sender_id=user_id,
    )


def update_task_status(
    client: OdooClient,
    user_id: int,
    task_id: int,
    stage_id: Optional[int] = None,
    stage_name: Optional[str] = None,
    comment: Optional[str] = None,
) -> dict:
    tasks = client.call_kw(
        "project.task",
        "read",
        args=[[task_id]],
        kwargs={"fields": ["id", "name", "project_id", "stage_id"]},
        sender_id=user_id,
    )
    if not tasks:
        raise ValueError(f"Task {task_id} not found or not accessible")

    task = tasks[0]
    target_stage_id = stage_id

    if not target_stage_id and stage_name:
        project_ref = task.get("project_id")
        project_id = project_ref[0] if isinstance(project_ref, list) else project_ref
        stage_domain: list[Any] = [("name", "ilike", stage_name)]
        if project_id:
            stage_domain.extend(
                ["|", ("project_ids", "=", False), ("project_ids", "in", [project_id])]
            )

        stages = client.call_kw(
            "project.task.type",
            "search_read",
            args=[stage_domain],
            kwargs={"fields": ["id", "name"], "limit": 1, "order": "sequence asc"},
            sender_id=user_id,
        )
        if not stages:
            raise ValueError(f"Stage with name '{stage_name}' not found")
        target_stage_id = stages[0].get("id")

    if not target_stage_id and not comment:
        return {
            "ok": True,
            "task_id": task_id,
            "status": "noop",
            "message": "No stage change or comment requested",
        }

    if target_stage_id:
        client.call_kw(
            "project.task",
            "write",
            args=[[task_id], {"stage_id": target_stage_id}],
            sender_id=user_id,
        )

    if comment:
        client.call_kw(
            "project.task",
            "message_post",
            args=[[task_id]],
            kwargs={"body": comment, "message_type": "comment"},
            sender_id=user_id,
        )

    updated = client.call_kw(
        "project.task",
        "read",
        args=[[task_id]],
        kwargs={"fields": ["id", "name", "stage_id"]},
        sender_id=user_id,
    )

    return {
        "ok": True,
        "task_id": task_id,
        "stage_id": target_stage_id,
        "comment_posted": bool(comment),
        "task": updated[0] if updated else None,
    }
