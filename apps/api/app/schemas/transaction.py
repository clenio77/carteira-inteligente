"""
Transaction Pydantic schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.transaction import TransactionType
from app.schemas.asset import AssetResponse


class TransactionBase(BaseModel):
    """Base transaction schema"""

    asset_id: int
    type: TransactionType
    date: datetime
    quantity: float
    price: float
    total_amount: float
    fees: Optional[float] = 0.0
    broker: Optional[str] = None
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    """Schema for creating a transaction"""

    pass


class TransactionResponse(TransactionBase):
    """Schema for transaction response"""

    id: int
    user_id: int

    class Config:
        from_attributes = True


class TransactionWithAsset(TransactionResponse):
    """Transaction response with asset details"""

    asset: AssetResponse

    class Config:
        from_attributes = True

