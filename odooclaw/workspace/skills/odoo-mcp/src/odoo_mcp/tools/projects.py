from typing import Optional

from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.project_service import (
    find_task,
    create_task,
    update_task,
    find_my_tasks,
    update_task_status,
)
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access


def odoo_find_task(
    client: OdooClient,
    user_id: int,
    name: Optional[str] = None,
    project_id: Optional[int] = None,
    stage_id: Optional[int] = None,
    limit: int = 10,
) -> list:
    guard_model_access("project.task")
    return find_task(client, user_id, name, project_id, stage_id, limit)


def odoo_create_task(
    client: OdooClient,
    user_id: int,
    name: str,
    project_id: Optional[int] = None,
    description: Optional[str] = None,
    assigned_to: Optional[int] = None,
    deadline: Optional[str] = None,
) -> int:
    guard_model_access("project.task")
    audit_action(
        "CREATE_TASK",
        user_id,
        "project.task",
        [],
        {"name": name, "project_id": project_id},
    )
    return create_task(
        client, user_id, name, project_id, description, assigned_to, deadline
    )


def odoo_update_task(
    client: OdooClient,
    user_id: int,
    task_id: int,
    stage_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    deadline: Optional[str] = None,
) -> bool:
    guard_model_access("project.task")
    audit_action(
        "UPDATE_TASK",
        user_id,
        "project.task",
        [task_id],
        {"stage_id": stage_id, "assigned_to": assigned_to, "deadline": deadline},
    )
    return update_task(client, user_id, task_id, stage_id, assigned_to, deadline)


def odoo_find_my_tasks(
    client: OdooClient,
    user_id: int,
    project_id: Optional[int] = None,
    state: Optional[str] = None,
    date_deadline_from: Optional[str] = None,
    date_deadline_to: Optional[str] = None,
    limit: int = 20,
) -> list:
    guard_model_access("project.task")
    return find_my_tasks(
        client,
        user_id,
        project_id,
        state,
        date_deadline_from,
        date_deadline_to,
        limit,
    )


def odoo_update_task_status(
    client: OdooClient,
    user_id: int,
    task_id: int,
    stage_id: Optional[int] = None,
    stage_name: Optional[str] = None,
    comment: Optional[str] = None,
) -> dict:
    guard_model_access("project.task")
    audit_action(
        "UPDATE_TASK_STATUS",
        user_id,
        "project.task",
        [task_id],
        {
            "stage_id": stage_id,
            "stage_name": stage_name,
            "has_comment": bool(comment),
        },
    )
    return update_task_status(client, user_id, task_id, stage_id, stage_name, comment)
