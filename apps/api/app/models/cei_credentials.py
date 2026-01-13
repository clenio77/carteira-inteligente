"""
CEI Credentials database model (encrypted)
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CEICredentials(Base):
    """CEI Credentials model - stores encrypted user credentials for B3 CEI"""

    __tablename__ = "cei_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True
    )

    # Encrypted credentials
    cpf = Column(String, nullable=False)  # CPF (will be encrypted)
    encrypted_password = Column(String, nullable=False)  # Senha encriptada

    # Sync status
    is_active = Column(Boolean, default=True, nullable=False)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_status = Column(String, nullable=True)  # "success", "error", "pending"
    last_sync_error = Column(String, nullable=True)  # Erro da última sincronização

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", back_populates="cei_credentials")

    def __repr__(self):
        return f"<CEICredentials(user_id={self.user_id}, last_sync={self.last_sync_at})>"

