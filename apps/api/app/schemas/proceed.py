"""
Proceed Pydantic schemas
"""
from pydantic import BaseModel
from datetime import date
from typing import Optional
from app.models.proceed import ProceedType
from app.schemas.asset import AssetResponse


class ProceedBase(BaseModel):
    """Base proceed schema"""

    asset_id: int
    type: ProceedType
    date: date
    value_per_share: float
    quantity: float
    total_value: float
    description: Optional[str] = None


class ProceedCreate(ProceedBase):
    """Schema for creating a proceed"""

    pass


class ProceedResponse(ProceedBase):
    """Schema for proceed response"""

    id: int
    user_id: int

    class Config:
        from_attributes = True


class ProceedWithAsset(ProceedResponse):
    """Proceed response with asset details"""

    asset: AssetResponse

    class Config:
        from_attributes = True

