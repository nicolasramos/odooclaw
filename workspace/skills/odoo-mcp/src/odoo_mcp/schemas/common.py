from pydantic import BaseModel, Field
from typing import Optional

class BaseOdooRequest(BaseModel):
    """Base class providing the executing user context block if needed."""
    sender_id: Optional[int] = Field(None, description="The ID of the user requesting the action (for native delegation)")
