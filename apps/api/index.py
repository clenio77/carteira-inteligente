"""
Carteira Inteligente API
Main application entry point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger
from app.core.middleware import setup_monitoring_middleware
from app.routes import auth, health, cei, portfolio, notifications, market, portfolio_manage, fixed_income, analytics, personal_finance


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    
    Startup:
    - Initialize scheduler if enabled
    
    Shutdown:
    - Stop scheduler
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Start background scheduler if enabled
    if settings.ENABLE_SCHEDULER:
        from app.services.scheduler import start_scheduler
        logger.info("Starting background scheduler...")
        await start_scheduler()
    else:
        logger.info("Background scheduler disabled")
    
    yield
    
    # Shutdown
    if settings.ENABLE_SCHEDULER:
        from app.services.scheduler import stop_scheduler
        logger.info("Stopping background scheduler...")
        await stop_scheduler()
    
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API para consolidação e análise de carteiras de investimentos",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
    root_path="/api",
)

# Middleware to strip /api prefix if present (Vercel workaround)
@app.middleware("http")
async def strip_api_prefix(request, call_next):
    if request.url.path.startswith("/api"):
        request.scope["path"] = request.url.path[4:]
    response = await call_next(request)
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup monitoring middleware
setup_monitoring_middleware(app)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(cei.router, prefix="/cei", tags=["CEI Integration"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(market.router, tags=["Market Data"])
app.include_router(portfolio_manage.router, tags=["Portfolio Management"])
app.include_router(fixed_income.router, tags=["Fixed Income"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(personal_finance.router, tags=["Personal Finance"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Carteira Inteligente API",
        "version": settings.APP_VERSION,
        "status": "online",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )

