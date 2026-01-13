"""
Notification schemas for request/response
"""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.notification import NotificationType


class NotificationBase(BaseModel):
    """Base notification schema"""

    type: NotificationType
    title: str
    message: str
    asset_id: Optional[int] = None


class NotificationCreate(NotificationBase):
    """Schema for creating a notification"""

    user_id: int


class NotificationResponse(NotificationBase):
    """Schema for notification response"""

    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationWithAsset(NotificationResponse):
    """Notification response with asset information"""

    asset_ticker: Optional[str] = None
    asset_name: Optional[str] = None


class NotificationMarkRead(BaseModel):
    """Schema for marking notifications as read"""

    notification_ids: list[int]


class NotificationStats(BaseModel):
    """Notification statistics"""

    total: int
    unread: int
    read: int

