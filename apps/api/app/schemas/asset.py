"""
Asset Pydantic schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.asset import AssetType


class AssetBase(BaseModel):
    """Base asset schema"""

    ticker: str
    name: str
    type: AssetType
    sector: Optional[str] = None
    description: Optional[str] = None


class AssetCreate(AssetBase):
    """Schema for creating an asset"""

    pass


class AssetUpdate(BaseModel):
    """Schema for updating an asset"""

    name: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None


class AssetResponse(AssetBase):
    """Schema for asset response"""

    id: int

    class Config:
        from_attributes = True

