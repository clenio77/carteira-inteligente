"""
Background task scheduler for periodic sync
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.cei_credentials import CEICredentials
from app.services.cei_service import CEIService


logger = logging.getLogger(__name__)


class SyncScheduler:
    """
    Background scheduler for periodic portfolio synchronization
    
    Features:
    - Automatic sync for all active users
    - Configurable sync interval
    - Error handling and retry logic
    - Respects last sync timestamp
    """

    def __init__(self, interval_hours: int = 24):
        """
        Initialize scheduler
        
        Args:
            interval_hours: Hours between sync attempts (default: 24)
        """
        self.interval_hours = interval_hours
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the scheduler"""
        if self.is_running:
            logger.warning("Scheduler already running")
            return

        self.is_running = True
        self._task = asyncio.create_task(self._run())
        logger.info(
            f"Scheduler started (sync interval: {self.interval_hours}h)",
            extra={"interval_hours": self.interval_hours},
        )

    async def stop(self):
        """Stop the scheduler"""
        if not self.is_running:
            return

        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        logger.info("Scheduler stopped")

    async def _run(self):
        """Main scheduler loop"""
        while self.is_running:
            try:
                await self._sync_all_users()
            except Exception as e:
                logger.error(f"Error in scheduler loop: {str(e)}", exc_info=True)

            # Wait for next interval
            await asyncio.sleep(self.interval_hours * 3600)

    async def _sync_all_users(self):
        """Sync all users who need synchronization"""
        db = SessionLocal()
        try:
            # Get all active CEI credentials
            credentials_list = (
                db.query(CEICredentials)
                .filter(CEICredentials.is_active == True)
                .all()
            )

            logger.info(
                f"Starting scheduled sync for {len(credentials_list)} users",
                extra={"user_count": len(credentials_list)},
            )

            synced_count = 0
            skipped_count = 0
            error_count = 0

            for credentials in credentials_list:
                try:
                    # Check if sync is needed
                    if self._should_sync(credentials):
                        logger.info(
                            f"Syncing user {credentials.user_id}",
                            extra={"user_id": credentials.user_id},
                        )

                        # Perform sync
                        CEIService.sync_portfolio(db=db, user_id=credentials.user_id)
                        synced_count += 1

                        # Small delay to avoid overload
                        await asyncio.sleep(2)
                    else:
                        logger.debug(
                            f"Skipping user {credentials.user_id} (recently synced)",
                            extra={"user_id": credentials.user_id},
                        )
                        skipped_count += 1

                except Exception as e:
                    error_count += 1
                    logger.error(
                        f"Error syncing user {credentials.user_id}: {str(e)}",
                        extra={"user_id": credentials.user_id, "error": str(e)},
                    )

            logger.info(
                f"Scheduled sync completed: {synced_count} synced, {skipped_count} skipped, {error_count} errors",
                extra={
                    "synced": synced_count,
                    "skipped": skipped_count,
                    "errors": error_count,
                },
            )

        finally:
            db.close()

    def _should_sync(self, credentials: CEICredentials) -> bool:
        """
        Check if user should be synced
        
        Args:
            credentials: User's CEI credentials
            
        Returns:
            True if sync is needed, False otherwise
        """
        # If never synced, sync now
        if not credentials.last_sync_at:
            return True

        # Calculate time since last sync
        time_since_sync = datetime.utcnow() - credentials.last_sync_at

        # Sync if more than interval hours have passed
        return time_since_sync > timedelta(hours=self.interval_hours)


# Global scheduler instance
_scheduler: Optional[SyncScheduler] = None


def get_scheduler() -> SyncScheduler:
    """Get or create the global scheduler instance"""
    global _scheduler
    if _scheduler is None:
        # Get interval from settings (default: 24 hours)
        interval = getattr(settings, "SYNC_INTERVAL_HOURS", 24)
        _scheduler = SyncScheduler(interval_hours=interval)
    return _scheduler


async def start_scheduler():
    """Start the background scheduler"""
    scheduler = get_scheduler()
    await scheduler.start()


async def stop_scheduler():
    """Stop the background scheduler"""
    global _scheduler
    if _scheduler:
        await _scheduler.stop()

