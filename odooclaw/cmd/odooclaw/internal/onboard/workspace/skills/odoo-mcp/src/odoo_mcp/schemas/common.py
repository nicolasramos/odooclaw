from pydantic import BaseModel, Field


class BaseOdooRequest(BaseModel):
    """Base class providing the executing user context block if needed."""

    sender_id: int | None = Field(
        None, description="The ID of the user requesting the action (for native delegation)"
    )
