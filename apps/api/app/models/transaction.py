"""
Transaction database model
"""
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class TransactionType(enum.Enum):
    """Transaction type enumeration"""

    BUY = "BUY"  # Compra
    SELL = "SELL"  # Venda


class Transaction(Base):
    """Transaction model - represents a buy/sell transaction"""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)

    # Transaction data
    type = Column(Enum(TransactionType), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    quantity = Column(Float, nullable=False)  # Quantidade negociada
    price = Column(Float, nullable=False)  # Preço unitário
    total_amount = Column(Float, nullable=False)  # Valor total (quantity * price)
    fees = Column(Float, nullable=True, default=0.0)  # Taxas e corretagem

    # Optional metadata
    broker = Column(String, nullable=True)  # Corretora
    notes = Column(String, nullable=True)  # Observações
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="transactions")
    asset = relationship("Asset", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction(type={self.type}, asset_id={self.asset_id}, quantity={self.quantity}, date={self.date})>"

