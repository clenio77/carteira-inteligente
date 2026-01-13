"""
Health check and monitoring routes
"""
import psutil
import time
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings

router = APIRouter()

# Track startup time
_startup_time = time.time()


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint
    
    Returns application status and database connectivity
    """
    # Test database connection
    try:
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/metrics")
async def get_metrics():
    """
    Basic system metrics endpoint
    
    Returns system health metrics:
    - Uptime
    - CPU usage
    - Memory usage
    - Disk usage
    
    Note: In production, use proper monitoring tools like Prometheus
    """
    try:
        uptime_seconds = time.time() - _startup_time
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used_mb = memory.used / (1024 * 1024)
        memory_total_mb = memory.total / (1024 * 1024)
        
        # Disk metrics
        disk = psutil.disk_usage("/")
        disk_percent = disk.percent
        disk_used_gb = disk.used / (1024 * 1024 * 1024)
        disk_total_gb = disk.total / (1024 * 1024 * 1024)
        
        return {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "uptime_seconds": round(uptime_seconds, 2),
            "uptime_hours": round(uptime_seconds / 3600, 2),
            "system": {
                "cpu": {
                    "usage_percent": cpu_percent,
                    "cores": cpu_count,
                },
                "memory": {
                    "usage_percent": memory_percent,
                    "used_mb": round(memory_used_mb, 2),
                    "total_mb": round(memory_total_mb, 2),
                },
                "disk": {
                    "usage_percent": disk_percent,
                    "used_gb": round(disk_used_gb, 2),
                    "total_gb": round(disk_total_gb, 2),
                },
            },
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

