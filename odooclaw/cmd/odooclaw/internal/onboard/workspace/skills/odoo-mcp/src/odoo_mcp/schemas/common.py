from pydantic import BaseModel, Field
from typing import Optional


class BaseOdooRequest(BaseModel):
    """Base class providing optional caller context metadata."""

    sender_id: Optional[int] = Field(
        None,
        description="Optional caller user ID for audit/context metadata. RPC execution runs as authenticated session user.",
    )
