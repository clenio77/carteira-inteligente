"""
Tests for notifications API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from app.models.notification import Notification, NotificationType
from app.models.asset import Asset, AssetType


def test_get_notifications_empty(client: TestClient, auth_headers: dict):
    """Test getting notifications when user has none"""
    response = client.get("/notifications/", headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json() == []


def test_get_notification_stats_empty(client: TestClient, auth_headers: dict):
    """Test getting notification stats when user has none"""
    response = client.get("/notifications/stats", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["unread"] == 0
    assert data["read"] == 0


def test_create_and_get_notification(client: TestClient, auth_headers: dict, db, test_user):
    """Test creating and retrieving a notification"""
    # Create a notification directly in DB
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.INFO,
        title="Test Notification",
        message="This is a test notification",
    )
    db.add(notification)
    db.commit()
    
    # Get notifications
    response = client.get("/notifications/", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Notification"
    assert data[0]["message"] == "This is a test notification"
    assert data[0]["is_read"] is False


def test_get_notification_stats_with_notifications(client: TestClient, auth_headers: dict, db, test_user):
    """Test getting notification stats with read and unread notifications"""
    # Create 3 unread and 2 read notifications
    for i in range(3):
        notification = Notification(
            user_id=test_user.id,
            type=NotificationType.INFO,
            title=f"Unread {i}",
            message=f"Message {i}",
            is_read=False,
        )
        db.add(notification)
    
    for i in range(2):
        notification = Notification(
            user_id=test_user.id,
            type=NotificationType.INFO,
            title=f"Read {i}",
            message=f"Message {i}",
            is_read=True,
        )
        db.add(notification)
    
    db.commit()
    
    # Get stats
    response = client.get("/notifications/stats", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 5
    assert data["unread"] == 3
    assert data["read"] == 2


def test_mark_notification_as_read(client: TestClient, auth_headers: dict, db, test_user):
    """Test marking a notification as read"""
    # Create a notification
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.INFO,
        title="Test",
        message="Message",
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # Mark as read
    response = client.post(
        "/notifications/read",
        json={"notification_ids": [notification.id]},
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["updated_count"] == 1
    
    # Verify it's marked as read
    db.refresh(notification)
    assert notification.is_read is True
    assert notification.read_at is not None


def test_mark_all_notifications_as_read(client: TestClient, auth_headers: dict, db, test_user):
    """Test marking all notifications as read"""
    # Create 3 unread notifications
    for i in range(3):
        notification = Notification(
            user_id=test_user.id,
            type=NotificationType.INFO,
            title=f"Test {i}",
            message=f"Message {i}",
            is_read=False,
        )
        db.add(notification)
    
    db.commit()
    
    # Mark all as read
    response = client.post("/notifications/read-all", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["updated_count"] == 3


def test_delete_notification(client: TestClient, auth_headers: dict, db, test_user):
    """Test deleting a notification"""
    # Create a notification
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.INFO,
        title="Test",
        message="Message",
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # Delete it
    response = client.delete(f"/notifications/{notification.id}", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Verify it's deleted
    response = client.get("/notifications/", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 0


def test_get_notifications_with_asset(client: TestClient, auth_headers: dict, db, test_user):
    """Test getting notifications that reference an asset"""
    # Create an asset
    asset = Asset(
        ticker="PETR4",
        name="Petrobras PN",
        type=AssetType.ACAO,
        sector="Energia"
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    # Create a notification with asset
    notification = Notification(
        user_id=test_user.id,
        type=NotificationType.DIVIDEND,
        title="Dividendo PETR4",
        message="Dividendo de R$ 0.50 será pago",
        asset_id=asset.id,
    )
    db.add(notification)
    db.commit()
    
    # Get notifications
    response = client.get("/notifications/", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["asset_ticker"] == "PETR4"
    assert data[0]["asset_name"] == "Petrobras PN"


def test_cannot_access_other_users_notifications(client: TestClient, db):
    """Test that users can't access other users' notifications"""
    from app.models.user import User
    from app.core.security import get_password_hash, create_access_token
    
    # Create two users
    user1 = User(email="user1@test.com", hashed_password=get_password_hash("password"))
    user2 = User(email="user2@test.com", hashed_password=get_password_hash("password"))
    db.add(user1)
    db.add(user2)
    db.commit()
    db.refresh(user1)
    db.refresh(user2)
    
    # Create notification for user1
    notification = Notification(
        user_id=user1.id,
        type=NotificationType.INFO,
        title="User1 Notification",
        message="Private message",
    )
    db.add(notification)
    db.commit()
    
    # Login as user2
    token = create_access_token(data={"sub": str(user2.id), "email": user2.email})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to get notifications as user2
    response = client.get("/notifications/", headers=headers)
    
    assert response.status_code == 200
    # Should see no notifications
    assert len(response.json()) == 0


def test_filter_unread_notifications(client: TestClient, auth_headers: dict, db, test_user):
    """Test filtering to get only unread notifications"""
    # Create 2 unread and 2 read notifications
    for i in range(2):
        notification = Notification(
            user_id=test_user.id,
            type=NotificationType.INFO,
            title=f"Unread {i}",
            message="Message",
            is_read=False,
        )
        db.add(notification)
    
    for i in range(2):
        notification = Notification(
            user_id=test_user.id,
            type=NotificationType.INFO,
            title=f"Read {i}",
            message="Message",
            is_read=True,
        )
        db.add(notification)
    
    db.commit()
    
    # Get only unread
    response = client.get("/notifications/?unread_only=true", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(n["is_read"] is False for n in data)


def test_notification_service_generates_dividend_notifications(db, test_user):
    """Test that notification service generates dividend notifications"""
    from app.services.notification_service import NotificationService
    from app.models.proceed import Proceed, ProceedType
    from datetime import date, timedelta
    
    # Create an asset
    asset = Asset(
        ticker="PETR4",
        name="Petrobras PN",
        type=AssetType.ACAO,
        sector="Energia"
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    # Create a future proceed
    future_date = date.today() + timedelta(days=5)
    proceed = Proceed(
        user_id=test_user.id,
        asset_id=asset.id,
        type=ProceedType.DIVIDEND,
        date=future_date,
        value_per_share=0.50,
        quantity=100,
        total_value=50.0,
        description="Dividendo"
    )
    db.add(proceed)
    db.commit()
    
    # Generate notifications
    notifications = NotificationService.generate_upcoming_dividend_notifications(
        db=db,
        user_id=test_user.id,
        days_ahead=7
    )
    
    assert len(notifications) == 1
    assert notifications[0].type == NotificationType.DIVIDEND
    assert "PETR4" in notifications[0].title

