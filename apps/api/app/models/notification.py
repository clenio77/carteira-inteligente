"""
Notification database model
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class NotificationType(enum.Enum):
    """Notification type enumeration"""

    DIVIDEND = "DIVIDEND"  # Dividend payment notification
    JCP = "JCP"  # Interest on equity
    EARNINGS = "EARNINGS"  # Earnings release
    CORPORATE_ACTION = "CORPORATE_ACTION"  # Stock split, merger, etc.
    SYNC_STATUS = "SYNC_STATUS"  # CEI sync status
    ALERT = "ALERT"  # General alert
    INFO = "INFO"  # Informational


class Notification(Base):
    """Notification model - represents a notification for a user"""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Notification content
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    
    # Optional related asset
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    
    # Status
    is_read = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", backref="notifications")
    asset = relationship("Asset", backref="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, type={self.type}, user_id={self.user_id}, is_read={self.is_read})>"

