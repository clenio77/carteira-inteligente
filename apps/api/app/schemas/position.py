"""
Asset Position Pydantic schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.asset import AssetResponse


class PositionBase(BaseModel):
    """Base position schema"""

    asset_id: int
    quantity: float
    average_price: float
    current_price: Optional[float] = None


class PositionCreate(PositionBase):
    """Schema for creating a position"""

    pass


class PositionUpdate(BaseModel):
    """Schema for updating a position"""

    quantity: Optional[float] = None
    average_price: Optional[float] = None
    current_price: Optional[float] = None


class PositionResponse(PositionBase):
    """Schema for position response with calculated fields"""

    id: int
    user_id: int
    total_value: float
    total_invested: float
    profit_loss: float
    profit_loss_percentage: float
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class PositionWithAsset(PositionResponse):
    """Position response with asset details"""

    asset: AssetResponse

    class Config:
        from_attributes = True

