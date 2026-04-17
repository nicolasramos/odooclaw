from odoo_mcp.core.client import OdooClient
from odoo_mcp.observability.logging import get_logger

_logger = get_logger("project_service")

def find_task(client: OdooClient, user_id: int, name: str = None, project_id: int = None, stage_id: int = None, limit: int = 10) -> list:
    domain = []
    if name: domain.append(("name", "ilike", name))
    if project_id: domain.append(("project_id", "=", project_id))
    if stage_id: domain.append(("stage_id", "=", stage_id))
    
    _logger.info(f"Finding tasks with domain: {domain}")
    return client.call_kw("project.task", "search_read", args=[domain], kwargs={"fields": ["id", "name", "project_id", "stage_id", "user_ids"], "limit": limit}, sender_id=user_id)

def create_task(client: OdooClient, user_id: int, name: str, project_id: int = None, description: str = None, assigned_to: int = None, deadline: str = None) -> int:
    values = {"name": name}
    if project_id: values["project_id"] = project_id
    if description: values["description"] = description
    if assigned_to: values["user_ids"] = [(4, assigned_to)]
    if deadline: values["date_deadline"] = deadline
    
    _logger.info(f"Creating task '{name}'")
    return client.call_kw("project.task", "create", args=[values], sender_id=user_id)

def update_task(client: OdooClient, user_id: int, task_id: int, stage_id: int = None, assigned_to: int = None, deadline: str = None) -> bool:
    values = {}
    if stage_id: values["stage_id"] = stage_id
    if assigned_to: values["user_ids"] = [(4, assigned_to)]
    if deadline: values["date_deadline"] = deadline
    
    if not values:
        return True
        
    _logger.info(f"Updating task {task_id} with {values}")
    return client.call_kw("project.task", "write", args=[[task_id], values], sender_id=user_id)
