"""
Notification Service
Handles creation and management of user notifications
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from app.models.notification import Notification, NotificationType
from app.models.proceed import Proceed, ProceedType
from app.models.asset import Asset
from app.core.logging import logger


class NotificationService:
    """Service for managing notifications"""

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        asset_id: Optional[int] = None,
    ) -> Notification:
        """Create a new notification"""
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            asset_id=asset_id,
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        logger.info(f"Created notification {notification.id} for user {user_id}: {title}")
        
        return notification

    @staticmethod
    def create_dividend_notification(
        db: Session,
        user_id: int,
        asset: Asset,
        proceed: Proceed,
    ) -> Notification:
        """Create a notification for upcoming dividend payment"""
        
        proceed_type_map = {
            ProceedType.DIVIDEND: "Dividendo",
            ProceedType.JCP: "Juros sobre Capital Próprio",
            ProceedType.RENDIMENTO: "Rendimento",
            ProceedType.BONIFICACAO: "Bonificação",
            ProceedType.DIREITO: "Direito de Subscrição",
        }
        
        proceed_name = proceed_type_map.get(proceed.type, "Provento")
        
        title = f"{proceed_name} de {asset.ticker}"
        message = (
            f"{proceed_name} de R$ {proceed.total_value:.2f} "
            f"será pago em {proceed.date.strftime('%d/%m/%Y')}."
        )
        
        notification_type = (
            NotificationType.DIVIDEND
            if proceed.type == ProceedType.DIVIDEND
            else NotificationType.JCP
            if proceed.type == ProceedType.JCP
            else NotificationType.INFO
        )
        
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            asset_id=asset.id,
        )

    @staticmethod
    def create_sync_notification(
        db: Session,
        user_id: int,
        success: bool,
        message: str,
    ) -> Notification:
        """Create a notification about CEI sync status"""
        
        title = "Sincronização Concluída" if success else "Erro na Sincronização"
        notification_type = NotificationType.SYNC_STATUS
        
        return NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
        )

    @staticmethod
    def generate_upcoming_dividend_notifications(
        db: Session,
        user_id: int,
        days_ahead: int = 7,
    ) -> List[Notification]:
        """
        Generate notifications for upcoming dividend payments
        
        Args:
            db: Database session
            user_id: User ID
            days_ahead: Number of days to look ahead for upcoming payments
        
        Returns:
            List of created notifications
        """
        cutoff_date = datetime.now().date() + timedelta(days=days_ahead)
        today = datetime.now().date()
        
        # Find upcoming proceeds for this user
        upcoming_proceeds = (
            db.query(Proceed)
            .join(Asset)
            .filter(
                Proceed.user_id == user_id,
                Proceed.date >= today,
                Proceed.date <= cutoff_date,
            )
            .all()
        )
        
        notifications = []
        
        for proceed in upcoming_proceeds:
            # Check if notification already exists
            existing = (
                db.query(Notification)
                .filter(
                    Notification.user_id == user_id,
                    Notification.asset_id == proceed.asset_id,
                    Notification.type.in_([NotificationType.DIVIDEND, NotificationType.JCP]),
                    Notification.created_at >= today,
                )
                .first()
            )
            
            if not existing:
                asset = db.query(Asset).filter(Asset.id == proceed.asset_id).first()
                if asset:
                    notification = NotificationService.create_dividend_notification(
                        db=db,
                        user_id=user_id,
                        asset=asset,
                        proceed=proceed,
                    )
                    notifications.append(notification)
        
        logger.info(
            f"Generated {len(notifications)} dividend notifications for user {user_id}"
        )
        
        return notifications

    @staticmethod
    def mark_as_read(
        db: Session,
        notification_id: int,
        user_id: int,
    ) -> bool:
        """Mark a notification as read"""
        notification = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        
        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.commit()
            return True
        
        return False

    @staticmethod
    def delete_old_notifications(
        db: Session,
        user_id: int,
        days_old: int = 30,
    ) -> int:
        """
        Delete old read notifications
        
        Args:
            db: Database session
            user_id: User ID
            days_old: Delete notifications older than this many days
        
        Returns:
            Number of notifications deleted
        """
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        deleted_count = (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == True,
                Notification.created_at < cutoff_date,
            )
            .delete()
        )
        
        db.commit()
        
        logger.info(
            f"Deleted {deleted_count} old notifications for user {user_id}"
        )
        
        return deleted_count

