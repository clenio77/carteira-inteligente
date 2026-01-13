"""
Fixed Income (Renda Fixa) database model

Supports: Tesouro Direto, CDB, LCI, LCA, Debêntures, etc.
"""
from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
import enum
from app.core.database import Base


class FixedIncomeType(enum.Enum):
    """Types of fixed income investments"""
    TESOURO_SELIC = "TESOURO_SELIC"  # Tesouro Selic (LFT)
    TESOURO_PREFIXADO = "TESOURO_PREFIXADO"  # Tesouro Prefixado (LTN)
    TESOURO_PREFIXADO_JUROS = "TESOURO_PREFIXADO_JUROS"  # Tesouro Prefixado com Juros Semestrais (NTN-F)
    TESOURO_IPCA = "TESOURO_IPCA"  # Tesouro IPCA+ (NTN-B Principal)
    TESOURO_IPCA_JUROS = "TESOURO_IPCA_JUROS"  # Tesouro IPCA+ com Juros Semestrais (NTN-B)
    CDB = "CDB"  # Certificado de Depósito Bancário
    LCI = "LCI"  # Letra de Crédito Imobiliário
    LCA = "LCA"  # Letra de Crédito do Agronegócio
    LC = "LC"  # Letra de Câmbio
    DEBENTURE = "DEBENTURE"  # Debênture
    CRI = "CRI"  # Certificado de Recebíveis Imobiliários
    CRA = "CRA"  # Certificado de Recebíveis do Agronegócio
    POUPANCA = "POUPANCA"  # Poupança
    OUTRO = "OUTRO"  # Outros


class IndexerType(enum.Enum):
    """Types of indexers for fixed income"""
    SELIC = "SELIC"  # Taxa Selic
    CDI = "CDI"  # CDI
    IPCA = "IPCA"  # IPCA
    IGPM = "IGPM"  # IGP-M
    PREFIXADO = "PREFIXADO"  # Taxa prefixada
    TR = "TR"  # Taxa Referencial (poupança)
    OUTRO = "OUTRO"


class FixedIncomeInvestment(Base):
    """Fixed income investment model"""
    
    __tablename__ = "fixed_income_investments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Investment identification
    name = Column(String, nullable=False)  # Ex: "Tesouro Selic 2029"
    type = Column(Enum(FixedIncomeType), nullable=False)
    issuer = Column(String, nullable=True)  # Bank/issuer name
    
    # Investment details
    invested_amount = Column(Float, nullable=False)  # Valor investido
    purchase_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=True)  # Vencimento
    
    # Rate information
    indexer = Column(Enum(IndexerType), nullable=False)
    rate = Column(Float, nullable=False)  # Taxa (ex: 100% CDI, IPCA+5%, 12% a.a.)
    is_percentage_of_indexer = Column(Integer, default=1)  # 1 = % do indexador, 0 = + indexador
    
    # Current values (updated periodically)
    current_value = Column(Float, nullable=True)
    gross_value = Column(Float, nullable=True)  # Before taxes
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    
    # Metadata
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="fixed_income_investments")
    
    @property
    def days_invested(self) -> int:
        """Days since purchase"""
        today = date.today()
        return (today - self.purchase_date).days
    
    @property
    def days_to_maturity(self) -> int | None:
        """Days until maturity"""
        if not self.maturity_date:
            return None
        today = date.today()
        return max(0, (self.maturity_date - today).days)
    
    @property
    def is_mature(self) -> bool:
        """Check if investment has matured"""
        if not self.maturity_date:
            return False
        return date.today() >= self.maturity_date
    
    @property
    def profit_loss(self) -> float:
        """Current profit/loss"""
        if self.current_value:
            return self.current_value - self.invested_amount
        return 0.0
    
    @property
    def profit_loss_percentage(self) -> float:
        """Profit/loss as percentage"""
        if self.invested_amount > 0 and self.current_value:
            return ((self.current_value - self.invested_amount) / self.invested_amount) * 100
        return 0.0
    
    def calculate_estimated_value(
        self,
        selic_rate: float = 13.25,  # Taxa Selic anual
        cdi_rate: float = 13.15,    # CDI anual  
        ipca_rate: float = 4.5,     # IPCA anual
    ) -> float:
        """
        Calculate estimated current value based on indexer and rate.
        This is a simplified calculation for estimation purposes.
        """
        days = self.days_invested
        if days <= 0:
            return self.invested_amount
        
        # Convert days to years for calculation
        years = days / 365.0
        
        # Get base rate based on indexer
        if self.indexer == IndexerType.SELIC:
            base_rate = selic_rate
        elif self.indexer == IndexerType.CDI:
            base_rate = cdi_rate
        elif self.indexer == IndexerType.IPCA:
            base_rate = ipca_rate
        elif self.indexer == IndexerType.PREFIXADO:
            base_rate = 0  # No indexer, just the rate
        elif self.indexer == IndexerType.TR:
            base_rate = 0.5  # TR aproximada
        else:
            base_rate = cdi_rate  # Default to CDI
        
        # Calculate effective rate
        if self.is_percentage_of_indexer:
            # Rate is a percentage of the indexer (e.g., 100% CDI)
            effective_rate = base_rate * (self.rate / 100)
        else:
            # Rate is added to the indexer (e.g., IPCA + 5%)
            effective_rate = base_rate + self.rate
        
        # Compound interest calculation
        # Using daily compounding for more accuracy
        daily_rate = (1 + effective_rate / 100) ** (1/365) - 1
        estimated_value = self.invested_amount * ((1 + daily_rate) ** days)
        
        return round(estimated_value, 2)
    
    def __repr__(self):
        return f"<FixedIncomeInvestment(name={self.name}, type={self.type}, invested={self.invested_amount})>"
