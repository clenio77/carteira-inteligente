"""
Middleware for monitoring and metrics
"""
import time
import uuid
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


logger = logging.getLogger(__name__)


class MonitoringMiddleware(BaseHTTPMiddleware):
    """
    Middleware for request monitoring and metrics
    
    Features:
    - Request ID generation and tracking
    - Response time measurement
    - Request/Response logging
    - Error tracking
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Start timer
        start_time = time.time()

        # Log incoming request
        logger.info(
            f"Request started: {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": str(request.query_params),
                "client_host": request.client.host if request.client else None,
            },
        )

        try:
            # Process request
            response = await call_next(request)

            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Log response
            logger.info(
                f"Request completed: {request.method} {request.url.path} - {response.status_code}",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                },
            )

            # Add headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{round(duration_ms, 2)}ms"

            return response

        except Exception as e:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Log error
            logger.error(
                f"Request failed: {request.method} {request.url.path} - {str(e)}",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                    "error": str(e),
                },
                exc_info=True,
            )

            # Re-raise exception to be handled by FastAPI
            raise


class HealthCheckFilter(logging.Filter):
    """
    Filter to suppress health check logs in production
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Suppress health check logs
        if hasattr(record, "path") and record.path == "/health":
            return False
        return True


def setup_monitoring_middleware(app):
    """
    Setup monitoring middleware and filters
    
    Args:
        app: FastAPI application
    """
    # Add monitoring middleware
    app.add_middleware(MonitoringMiddleware)

    # Add health check filter in production
    from app.core.config import settings

    if settings.ENVIRONMENT == "production":
        logger.addFilter(HealthCheckFilter())

    return app

