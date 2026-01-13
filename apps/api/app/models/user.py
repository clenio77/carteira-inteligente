"""
User database model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    """User model for authentication"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    positions = relationship("AssetPosition", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    proceeds = relationship("Proceed", back_populates="user")
    cei_credentials = relationship(
        "CEICredentials", back_populates="user", uselist=False
    )
    fixed_income_investments = relationship(
        "FixedIncomeInvestment", back_populates="user"
    )
    
    # Personal Finance
    pf_accounts = relationship("BankAccount", back_populates="user")
    pf_transactions = relationship("PersonalTransaction", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"

