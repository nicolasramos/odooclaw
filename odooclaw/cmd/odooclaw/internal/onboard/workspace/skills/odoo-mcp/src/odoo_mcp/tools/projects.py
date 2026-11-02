from odoo_mcp.core.client import OdooClient
from odoo_mcp.services.project_service import find_task, create_task, update_task
from odoo_mcp.security.audit import audit_action
from odoo_mcp.security.guards import guard_model_access

def odoo_find_task(client: OdooClient, user_id: int, name: str = None, project_id: int = None, stage_id: int = None, limit: int = 10) -> list:
    guard_model_access("project.task")
    return find_task(client, user_id, name, project_id, stage_id, limit)

def odoo_create_task(client: OdooClient, user_id: int, name: str, project_id: int = None, description: str = None, assigned_to: int = None, deadline: str = None) -> int:
    guard_model_access("project.task")
    audit_action("CREATE_TASK", user_id, "project.task", [], {"name": name, "project_id": project_id})
    return create_task(client, user_id, name, project_id, description, assigned_to, deadline)

def odoo_update_task(client: OdooClient, user_id: int, task_id: int, stage_id: int = None, assigned_to: int = None, deadline: str = None) -> bool:
    guard_model_access("project.task")
    audit_action("UPDATE_TASK", user_id, "project.task", [task_id], {"stage_id": stage_id, "assigned_to": assigned_to, "deadline": deadline})
    return update_task(client, user_id, task_id, stage_id, assigned_to, deadline)
