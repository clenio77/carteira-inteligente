"""
Asset database model
"""
from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class AssetType(enum.Enum):
    """Asset type enumeration"""

    ACAO = "ACAO"  # Ações
    FII = "FII"  # Fundos Imobiliários
    ETF = "ETF"  # ETFs
    RENDA_FIXA = "RENDA_FIXA"  # Títulos de Renda Fixa
    BDR = "BDR"  # Brazilian Depositary Receipts
    CRYPTO = "CRYPTO"  # Criptomoedas (futuro)


class Asset(Base):
    """Asset model - represents a tradeable asset"""

    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(Enum(AssetType), nullable=False)
    sector = Column(String, nullable=True)  # Setor (Financeiro, Tecnologia, etc.)
    description = Column(String, nullable=True)

    # Relationships
    positions = relationship("AssetPosition", back_populates="asset")
    transactions = relationship("Transaction", back_populates="asset")
    proceeds = relationship("Proceed", back_populates="asset")

    def __repr__(self):
        return f"<Asset(ticker={self.ticker}, name={self.name}, type={self.type})>"

