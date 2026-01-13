"""
CEI Pydantic schemas
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class CEICredentialsCreate(BaseModel):
    """Schema for creating CEI credentials"""

    cpf: str = Field(..., min_length=11, max_length=14)  # CPF com ou sem formatação
    password: str = Field(..., min_length=1)


class CEICredentialsResponse(BaseModel):
    """Schema for CEI credentials response (without sensitive data)"""

    id: int
    user_id: int
    cpf: str  # Mascarado no response
    is_active: bool
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CEISyncStatus(BaseModel):
    """Schema for CEI sync status"""

    status: str  # "pending", "running", "success", "error"
    message: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    assets_synced: Optional[int] = None
    transactions_synced: Optional[int] = None
    proceeds_synced: Optional[int] = None

