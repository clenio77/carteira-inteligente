"""
Fixed Income Routes

Endpoints for managing fixed income investments (Tesouro Direto, CDB, LCI, etc.)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from enum import Enum

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.fixed_income import (
    FixedIncomeInvestment,
    FixedIncomeType,
    IndexerType,
)
from app.core.logging import logger

router = APIRouter(prefix="/fixed-income", tags=["Fixed Income"])


# =============================================================================
# SCHEMAS
# =============================================================================

class FixedIncomeTypeEnum(str, Enum):
    TESOURO_SELIC = "TESOURO_SELIC"
    TESOURO_PREFIXADO = "TESOURO_PREFIXADO"
    TESOURO_PREFIXADO_JUROS = "TESOURO_PREFIXADO_JUROS"
    TESOURO_IPCA = "TESOURO_IPCA"
    TESOURO_IPCA_JUROS = "TESOURO_IPCA_JUROS"
    CDB = "CDB"
    LCI = "LCI"
    LCA = "LCA"
    LC = "LC"
    DEBENTURE = "DEBENTURE"
    CRI = "CRI"
    CRA = "CRA"
    POUPANCA = "POUPANCA"
    OUTRO = "OUTRO"


class IndexerTypeEnum(str, Enum):
    SELIC = "SELIC"
    CDI = "CDI"
    IPCA = "IPCA"
    IGPM = "IGPM"
    PREFIXADO = "PREFIXADO"
    TR = "TR"
    OUTRO = "OUTRO"


class AddFixedIncomeRequest(BaseModel):
    """Request to add a new fixed income investment"""
    name: str = Field(..., min_length=3, max_length=100, description="Investment name (e.g., 'Tesouro Selic 2029')")
    type: FixedIncomeTypeEnum = Field(..., description="Type of fixed income")
    issuer: Optional[str] = Field(None, description="Issuer/bank name")
    invested_amount: float = Field(..., gt=0, description="Amount invested")
    purchase_date: date = Field(..., description="Purchase date")
    maturity_date: Optional[date] = Field(None, description="Maturity date")
    indexer: IndexerTypeEnum = Field(..., description="Rate indexer (CDI, SELIC, IPCA, etc.)")
    rate: float = Field(..., description="Rate value (e.g., 100 for 100% CDI, or 5 for IPCA+5%)")
    is_percentage_of_indexer: bool = Field(True, description="True if rate is % of indexer, False if rate is added to indexer")
    notes: Optional[str] = Field(None, description="Additional notes")


class FixedIncomeResponse(BaseModel):
    """Fixed income investment response"""
    id: int
    name: str
    type: str
    issuer: Optional[str]
    invested_amount: float
    current_value: Optional[float]
    profit_loss: float
    profit_loss_percentage: float
    purchase_date: str
    maturity_date: Optional[str]
    days_invested: int
    days_to_maturity: Optional[int]
    is_mature: bool
    indexer: str
    rate: float
    is_percentage_of_indexer: bool
    rate_description: str
    notes: Optional[str]
    last_updated: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class FixedIncomeListResponse(BaseModel):
    """List of fixed income investments"""
    total_count: int
    total_invested: float
    total_current_value: float
    total_profit_loss: float
    total_profit_loss_percentage: float
    investments: List[FixedIncomeResponse]


class UpdateValuesResponse(BaseModel):
    """Response for updating fixed income values"""
    success: bool
    message: str
    updated_count: int
    total_value: float


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_rate_description(indexer: IndexerType, rate: float, is_percentage: bool) -> str:
    """Generate human-readable rate description"""
    indexer_name = indexer.value
    
    if is_percentage:
        return f"{rate}% {indexer_name}"
    else:
        return f"{indexer_name} + {rate}%"


def investment_to_response(inv: FixedIncomeInvestment) -> FixedIncomeResponse:
    """Convert database model to response"""
    return FixedIncomeResponse(
        id=inv.id,
        name=inv.name,
        type=inv.type.value,
        issuer=inv.issuer,
        invested_amount=inv.invested_amount,
        current_value=inv.current_value,
        profit_loss=inv.profit_loss,
        profit_loss_percentage=inv.profit_loss_percentage,
        purchase_date=inv.purchase_date.isoformat(),
        maturity_date=inv.maturity_date.isoformat() if inv.maturity_date else None,
        days_invested=inv.days_invested,
        days_to_maturity=inv.days_to_maturity,
        is_mature=inv.is_mature,
        indexer=inv.indexer.value,
        rate=inv.rate,
        is_percentage_of_indexer=bool(inv.is_percentage_of_indexer),
        rate_description=get_rate_description(inv.indexer, inv.rate, bool(inv.is_percentage_of_indexer)),
        notes=inv.notes,
        last_updated=inv.last_updated.isoformat() if inv.last_updated else None,
        created_at=inv.created_at.isoformat() if inv.created_at else None,
    )


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/add", response_model=FixedIncomeResponse)
async def add_fixed_income(
    request: AddFixedIncomeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Add a new fixed income investment.
    
    Supports:
    - Tesouro Direto (Selic, Prefixado, IPCA)
    - CDB, LCI, LCA, LC
    - Debêntures, CRI, CRA
    - Poupança
    """
    # Validate dates
    if request.maturity_date and request.maturity_date < request.purchase_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maturity date cannot be before purchase date"
        )
    
    # Create investment
    investment = FixedIncomeInvestment(
        user_id=current_user.id,
        name=request.name,
        type=FixedIncomeType(request.type.value),
        issuer=request.issuer,
        invested_amount=request.invested_amount,
        purchase_date=request.purchase_date,
        maturity_date=request.maturity_date,
        indexer=IndexerType(request.indexer.value),
        rate=request.rate,
        is_percentage_of_indexer=1 if request.is_percentage_of_indexer else 0,
        notes=request.notes,
    )
    
    # Calculate initial estimated value
    investment.current_value = investment.calculate_estimated_value()
    investment.gross_value = investment.current_value
    
    db.add(investment)
    db.commit()
    db.refresh(investment)
    
    logger.info(f"User {current_user.id} added fixed income: {investment.name}")
    
    return investment_to_response(investment)


@router.get("/list", response_model=FixedIncomeListResponse)
async def list_fixed_income(
    include_mature: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all fixed income investments for the user.
    """
    query = db.query(FixedIncomeInvestment).filter(
        FixedIncomeInvestment.user_id == current_user.id
    )
    
    investments = query.order_by(FixedIncomeInvestment.maturity_date.asc()).all()
    
    # Filter out mature investments if requested
    if not include_mature:
        investments = [inv for inv in investments if not inv.is_mature]
    
    # Calculate totals
    total_invested = sum(inv.invested_amount for inv in investments)
    total_current_value = sum(inv.current_value or inv.invested_amount for inv in investments)
    total_profit_loss = total_current_value - total_invested
    total_profit_loss_percentage = (
        (total_profit_loss / total_invested * 100) if total_invested > 0 else 0
    )
    
    return FixedIncomeListResponse(
        total_count=len(investments),
        total_invested=round(total_invested, 2),
        total_current_value=round(total_current_value, 2),
        total_profit_loss=round(total_profit_loss, 2),
        total_profit_loss_percentage=round(total_profit_loss_percentage, 2),
        investments=[investment_to_response(inv) for inv in investments],
    )


@router.get("/{investment_id}", response_model=FixedIncomeResponse)
async def get_fixed_income(
    investment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get details of a specific fixed income investment.
    """
    investment = db.query(FixedIncomeInvestment).filter(
        FixedIncomeInvestment.id == investment_id,
        FixedIncomeInvestment.user_id == current_user.id,
    ).first()
    
    if not investment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment not found"
        )
    
    return investment_to_response(investment)


@router.delete("/{investment_id}")
async def delete_fixed_income(
    investment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a fixed income investment.
    """
    investment = db.query(FixedIncomeInvestment).filter(
        FixedIncomeInvestment.id == investment_id,
        FixedIncomeInvestment.user_id == current_user.id,
    ).first()
    
    if not investment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment not found"
        )
    
    db.delete(investment)
    db.commit()
    
    logger.info(f"User {current_user.id} deleted fixed income: {investment.name}")
    
    return {"message": "Investment deleted successfully"}


@router.post("/update-values", response_model=UpdateValuesResponse)
async def update_fixed_income_values(
    selic_rate: float = 13.25,
    cdi_rate: float = 13.15,
    ipca_rate: float = 4.5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update estimated current values for all fixed income investments.
    
    Args:
        selic_rate: Current annual Selic rate (default: 13.25%)
        cdi_rate: Current annual CDI rate (default: 13.15%)
        ipca_rate: Current annual IPCA rate (default: 4.5%)
    """
    investments = db.query(FixedIncomeInvestment).filter(
        FixedIncomeInvestment.user_id == current_user.id
    ).all()
    
    if not investments:
        return UpdateValuesResponse(
            success=True,
            message="No investments to update",
            updated_count=0,
            total_value=0,
        )
    
    total_value = 0
    for inv in investments:
        inv.current_value = inv.calculate_estimated_value(
            selic_rate=selic_rate,
            cdi_rate=cdi_rate,
            ipca_rate=ipca_rate,
        )
        inv.last_updated = datetime.utcnow()
        total_value += inv.current_value
    
    db.commit()
    
    return UpdateValuesResponse(
        success=True,
        message=f"Updated {len(investments)} investments",
        updated_count=len(investments),
        total_value=round(total_value, 2),
    )


@router.get("/types/list")
async def list_investment_types():
    """
    Get list of available fixed income types with descriptions.
    """
    types = [
        {"value": "TESOURO_SELIC", "label": "Tesouro Selic", "description": "Título pós-fixado atrelado à taxa Selic"},
        {"value": "TESOURO_PREFIXADO", "label": "Tesouro Prefixado", "description": "Título com taxa fixa definida na compra"},
        {"value": "TESOURO_PREFIXADO_JUROS", "label": "Tesouro Prefixado c/ Juros", "description": "Título prefixado com pagamento de juros semestrais"},
        {"value": "TESOURO_IPCA", "label": "Tesouro IPCA+", "description": "Título híbrido: IPCA + taxa fixa"},
        {"value": "TESOURO_IPCA_JUROS", "label": "Tesouro IPCA+ c/ Juros", "description": "IPCA + taxa fixa com juros semestrais"},
        {"value": "CDB", "label": "CDB", "description": "Certificado de Depósito Bancário"},
        {"value": "LCI", "label": "LCI", "description": "Letra de Crédito Imobiliário (isento IR)"},
        {"value": "LCA", "label": "LCA", "description": "Letra de Crédito do Agronegócio (isento IR)"},
        {"value": "LC", "label": "LC", "description": "Letra de Câmbio"},
        {"value": "DEBENTURE", "label": "Debênture", "description": "Título de dívida de empresas"},
        {"value": "CRI", "label": "CRI", "description": "Certificado de Recebíveis Imobiliários"},
        {"value": "CRA", "label": "CRA", "description": "Certificado de Recebíveis do Agronegócio"},
        {"value": "POUPANCA", "label": "Poupança", "description": "Caderneta de poupança"},
        {"value": "OUTRO", "label": "Outro", "description": "Outro tipo de renda fixa"},
    ]
    
    indexers = [
        {"value": "SELIC", "label": "Selic", "description": "Taxa básica de juros"},
        {"value": "CDI", "label": "CDI", "description": "Certificado de Depósito Interbancário"},
        {"value": "IPCA", "label": "IPCA", "description": "Índice de Preços ao Consumidor Amplo"},
        {"value": "IGPM", "label": "IGP-M", "description": "Índice Geral de Preços do Mercado"},
        {"value": "PREFIXADO", "label": "Prefixado", "description": "Taxa fixa sem indexador"},
        {"value": "TR", "label": "TR", "description": "Taxa Referencial"},
        {"value": "OUTRO", "label": "Outro", "description": "Outro indexador"},
    ]
    
    return {
        "types": types,
        "indexers": indexers,
    }
