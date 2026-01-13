"""
Asset Position database model
"""
from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AssetPosition(Base):
    """AssetPosition model - represents a user's current position in an asset"""

    __tablename__ = "asset_positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)

    # Position data
    quantity = Column(Float, nullable=False, default=0.0)  # Quantidade de ativos
    average_price = Column(
        Float, nullable=False, default=0.0
    )  # Preço médio de compra
    current_price = Column(Float, nullable=True)  # Cotação atual (atualizada)

    # Metadata
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="positions")
    asset = relationship("Asset", back_populates="positions")

    # Calculated properties
    @property
    def total_value(self) -> float:
        """Total value of position (quantity * current_price or average_price)"""
        price = self.current_price if self.current_price is not None else self.average_price
        return self.quantity * price

    @property
    def total_invested(self) -> float:
        """Total amount invested (quantity * average_price)"""
        return self.quantity * self.average_price

    @property
    def profit_loss(self) -> float:
        """Profit or loss (total_value - total_invested)"""
        return self.total_value - self.total_invested

    @property
    def profit_loss_percentage(self) -> float:
        """Profit or loss percentage"""
        if self.total_invested > 0:
            return (self.profit_loss / self.total_invested) * 100
        return 0.0

    def __repr__(self):
        return f"<AssetPosition(user_id={self.user_id}, asset_id={self.asset_id}, quantity={self.quantity})>"

