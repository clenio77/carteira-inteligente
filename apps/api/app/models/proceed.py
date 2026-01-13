"""
Proceed (Provento) database model
"""
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Enum, Date
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class ProceedType(enum.Enum):
    """Proceed type enumeration"""

    DIVIDEND = "DIVIDEND"  # Dividendos
    JCP = "JCP"  # Juros sobre Capital Próprio
    RENDIMENTO = "RENDIMENTO"  # Rendimentos (FIIs)
    BONIFICACAO = "BONIFICACAO"  # Bonificação em ativos
    DIREITO = "DIREITO"  # Direito de subscrição


class Proceed(Base):
    """Proceed model - represents income from assets (dividends, JCP, etc.)"""

    __tablename__ = "proceeds"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)

    # Proceed data
    type = Column(Enum(ProceedType), nullable=False)
    date = Column(Date, nullable=False, index=True)  # Data de pagamento
    value_per_share = Column(Float, nullable=False)  # Valor por ação
    quantity = Column(Float, nullable=False)  # Quantidade de ações que receberam
    total_value = Column(Float, nullable=False)  # Valor total recebido

    # Optional metadata
    description = Column(String, nullable=True)  # Descrição do provento

    # Relationships
    user = relationship("User", back_populates="proceeds")
    asset = relationship("Asset", back_populates="proceeds")

    def __repr__(self):
        return f"<Proceed(type={self.type}, asset_id={self.asset_id}, value={self.total_value}, date={self.date})>"

