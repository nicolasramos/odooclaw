from odoo_mcp.core.client import OdooClient
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access
from odoo_mcp.services.project_service import (
    create_task,
    find_my_tasks,
    find_task,
    find_tasks_for_user,
    get_task_stats,
    update_task,
    update_task_status,
)


def odoo_find_task(
    client: OdooClient,
    user_id: int,
    name: str | None = None,
    project_id: int | None = None,
    stage_id: int | None = None,
    limit: int = 10,
) -> list:
    guard_model_access("project.task")
    return find_task(client, user_id, name, project_id, stage_id, limit)


def odoo_create_task(
    client: OdooClient,
    user_id: int,
    name: str,
    project_id: int | None = None,
    description: str | None = None,
    assigned_to: int | None = None,
    deadline: str | None = None,
) -> int:
    guard_model_access("project.task")
    audit_action(
        "CREATE_TASK",
        user_id,
        "project.task",
        [],
        {"name": name, "project_id": project_id},
    )
    return create_task(client, user_id, name, project_id, description, assigned_to, deadline)


def odoo_update_task(
    client: OdooClient,
    user_id: int,
    task_id: int,
    stage_id: int | None = None,
    assigned_to: int | None = None,
    deadline: str | None = None,
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
    project_id: int | None = None,
    state: str | None = None,
    date_deadline_from: str | None = None,
    date_deadline_to: str | None = None,
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
    stage_id: int | None = None,
    stage_name: str | None = None,
    comment: str | None = None,
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


def odoo_get_task_stats(
    client: OdooClient,
    user_id: int,
    project_id: int | None = None,
    user_ids: list[int] | None = None,
) -> dict:
    guard_model_access("project.task")
    return get_task_stats(client, user_id, project_id, user_ids)


def odoo_find_tasks_for_user(
    client: OdooClient,
    user_id: int,
    user_name: str,
    limit: int = 20,
) -> dict:
    guard_model_access("project.task")
    return find_tasks_for_user(client, user_id, user_name, limit)
