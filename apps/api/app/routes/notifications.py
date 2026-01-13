"""
Notifications routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.asset import Asset
from app.schemas.notification import (
    NotificationResponse,
    NotificationWithAsset,
    NotificationMarkRead,
    NotificationStats,
)

router = APIRouter()


@router.get("/", response_model=List[NotificationWithAsset])
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get user notifications
    
    - **skip**: Number of notifications to skip (for pagination)
    - **limit**: Maximum number of notifications to return
    - **unread_only**: If True, return only unread notifications
    """
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = (
        query.order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # Enrich with asset information
    result = []
    for notification in notifications:
        notification_dict = {
            "id": notification.id,
            "user_id": notification.user_id,
            "type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "asset_id": notification.asset_id,
            "is_read": notification.is_read,
            "created_at": notification.created_at,
            "read_at": notification.read_at,
            "asset_ticker": None,
            "asset_name": None,
        }
        
        if notification.asset_id:
            asset = db.query(Asset).filter(Asset.id == notification.asset_id).first()
            if asset:
                notification_dict["asset_ticker"] = asset.ticker
                notification_dict["asset_name"] = asset.name
        
        result.append(notification_dict)
    
    return result


@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get notification statistics for the current user
    
    Returns:
    - Total number of notifications
    - Number of unread notifications
    - Number of read notifications
    """
    total = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).count()
    
    unread = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    read = total - unread
    
    return {
        "total": total,
        "unread": unread,
        "read": read,
    }


@router.post("/read", response_model=dict)
async def mark_notifications_as_read(
    data: NotificationMarkRead,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark one or more notifications as read
    
    - **notification_ids**: List of notification IDs to mark as read
    """
    if not data.notification_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="notification_ids cannot be empty",
        )
    
    # Verify all notifications belong to the current user
    notifications = (
        db.query(Notification)
        .filter(
            Notification.id.in_(data.notification_ids),
            Notification.user_id == current_user.id,
        )
        .all()
    )
    
    if len(notifications) != len(data.notification_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more notifications not found",
        )
    
    # Mark as read
    updated_count = 0
    for notification in notifications:
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            updated_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "updated_count": updated_count,
        "message": f"{updated_count} notification(s) marked as read",
    }


@router.post("/read-all", response_model=dict)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark all notifications as read for the current user
    """
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .update(
            {
                "is_read": True,
                "read_at": datetime.utcnow(),
            }
        )
    )
    
    db.commit()
    
    return {
        "success": True,
        "updated_count": updated_count,
        "message": f"{updated_count} notification(s) marked as read",
    }


@router.delete("/{notification_id}", response_model=dict)
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a specific notification
    """
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    
    db.delete(notification)
    db.commit()
    
    return {
        "success": True,
        "message": "Notification deleted successfully",
    }

