"""
Application Configuration
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # Application
    APP_NAME: str = "Carteira Inteligente API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Convert ALLOWED_ORIGINS string to list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    # CEI (B3)
    CEI_BASE_URL: str = "https://cei.b3.com.br"

    # BRAPI.dev (Market Data API)
    # Optional: Get your token at https://brapi.dev/dashboard
    # Without token: only PETR4, VALE3, ITUB4, MGLU3 are available
    BRAPI_TOKEN: str = ""

    # Scheduler
    ENABLE_SCHEDULER: bool = True  # Enable background sync scheduler
    SYNC_INTERVAL_HOURS: int = 24  # Sync interval in hours
    
    # AI (Gemini)
    GOOGLE_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


# Create settings instance
settings = Settings()

