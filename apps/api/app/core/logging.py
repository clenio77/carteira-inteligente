"""
Logging configuration with structured logging support
"""
import logging
import sys
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any
from app.core.config import settings


class StructuredFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging
    """
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add extra fields if present
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "path"):
            log_data["path"] = record.path

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, default=str)


def setup_logging():
    """
    Configure application logging with structured logging
    
    In production: JSON format for structured logging (better for log aggregation)
    In development: Human-readable format
    """
    # Create logger
    logger = logging.getLogger()

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()

    # Set level based on environment
    logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    # Create console handler
    handler = logging.StreamHandler(sys.stdout)

    # Format
    if settings.ENVIRONMENT == "production":
        # JSON format for production (better for log aggregation)
        formatter = StructuredFormatter()
    else:
        # Human-readable format for development
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Reduce noise from external libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)

    return logger


def log_with_context(
    message: str,
    level: str = "info",
    request_id: Optional[str] = None,
    user_id: Optional[int] = None,
    extra: Optional[Dict[str, Any]] = None,
):
    """
    Log a message with additional context
    
    Args:
        message: Log message
        level: Log level (debug, info, warning, error, critical)
        request_id: Request ID for tracking
        user_id: User ID for tracking
        extra: Additional context data
    """
    logger = logging.getLogger(__name__)
    log_func = getattr(logger, level.lower())
    
    extra_data = extra or {}
    if request_id:
        extra_data["request_id"] = request_id
    if user_id:
        extra_data["user_id"] = user_id
    
    log_func(message, extra=extra_data)


# Initialize logging
logger = setup_logging()

