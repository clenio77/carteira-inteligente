"""
Portfolio routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.position import AssetPosition
from app.models.transaction import Transaction
from app.models.proceed import Proceed
from app.models.asset import Asset, AssetType
from app.schemas.position import PositionWithAsset
from app.schemas.transaction import TransactionWithAsset
from app.schemas.proceed import ProceedWithAsset

router = APIRouter()


@router.get("/overview")
async def get_portfolio_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get portfolio overview with key metrics
    
    Returns:
    - Total portfolio value
    - Total invested
    - Profit/Loss (amount and percentage)
    - Asset allocation by type
    - Top 5 positions
    """
    # Get all user positions with assets
    positions = (
        db.query(AssetPosition)
        .join(Asset)
        .filter(AssetPosition.user_id == current_user.id)
        .all()
    )

    if not positions:
        return {
            "total_value": 0.0,
            "total_invested": 0.0,
            "profit_loss": 0.0,
            "profit_loss_percentage": 0.0,
            "allocation_by_type": [],
            "allocation_by_sector": [],
            "top_positions": [],
            "positions_count": 0,
        }

    # Calculate totals
    total_value = sum(p.total_value for p in positions)
    total_invested = sum(p.total_invested for p in positions)
    profit_loss = total_value - total_invested
    profit_loss_percentage = (
        (profit_loss / total_invested * 100) if total_invested > 0 else 0.0
    )

    # Allocation by asset type
    allocation_by_type = {}
    allocation_by_sector = {}

    for position in positions:
        asset = db.query(Asset).filter(Asset.id == position.asset_id).first()

        # By type
        asset_type = asset.type.value
        if asset_type not in allocation_by_type:
            allocation_by_type[asset_type] = 0.0
        allocation_by_type[asset_type] += position.total_value

        # By sector
        if asset.sector:
            if asset.sector not in allocation_by_sector:
                allocation_by_sector[asset.sector] = 0.0
            allocation_by_sector[asset.sector] += position.total_value

    # Convert to percentages
    allocation_by_type_list = [
        {
            "type": type_name,
            "value": value,
            "percentage": round((value / total_value * 100) if total_value > 0 else 0, 2),
        }
        for type_name, value in allocation_by_type.items()
    ]

    allocation_by_sector_list = [
        {
            "sector": sector_name,
            "value": value,
            "percentage": round((value / total_value * 100) if total_value > 0 else 0, 2),
        }
        for sector_name, value in allocation_by_sector.items()
    ]

    # Top 5 positions
    sorted_positions = sorted(positions, key=lambda p: p.total_value, reverse=True)[:5]
    top_positions = []

    for position in sorted_positions:
        asset = db.query(Asset).filter(Asset.id == position.asset_id).first()
        top_positions.append({
            "ticker": asset.ticker,
            "name": asset.name,
            "value": round(position.total_value, 2),
            "percentage": round((position.total_value / total_value * 100) if total_value > 0 else 0, 2),
            "profit_loss_percentage": round(position.profit_loss_percentage, 2),
        })

    return {
        "total_value": round(total_value, 2),
        "total_invested": round(total_invested, 2),
        "profit_loss": round(profit_loss, 2),
        "profit_loss_percentage": round(profit_loss_percentage, 2),
        "allocation_by_type": allocation_by_type_list,
        "allocation_by_sector": allocation_by_sector_list,
        "top_positions": top_positions,
        "positions_count": len(positions),
    }


@router.get("/assets", response_model=List[PositionWithAsset])
async def get_portfolio_assets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get list of all assets in portfolio with details
    """
    positions = (
        db.query(AssetPosition)
        .filter(AssetPosition.user_id == current_user.id)
        .all()
    )

    result = []
    for position in positions:
        asset = db.query(Asset).filter(Asset.id == position.asset_id).first()
        
        # Convert to dict and add asset
        position_dict = {
            "id": position.id,
            "user_id": position.user_id,
            "asset_id": position.asset_id,
            "quantity": position.quantity,
            "average_price": position.average_price,
            "current_price": position.current_price,
            "total_value": position.total_value,
            "total_invested": position.total_invested,
            "profit_loss": position.profit_loss,
            "profit_loss_percentage": position.profit_loss_percentage,
            "last_updated": position.last_updated,
            "created_at": position.created_at,
            "asset": asset,
        }
        
        result.append(PositionWithAsset(**position_dict))

    return result


@router.get("/assets/{ticker}")
async def get_asset_detail(
    ticker: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get detailed information about a specific asset
    
    Includes:
    - Position details
    - Transaction history
    - Proceeds history
    """
    # Find asset
    asset = db.query(Asset).filter(Asset.ticker == ticker.upper()).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ativo {ticker} não encontrado",
        )

    # Find position
    position = (
        db.query(AssetPosition)
        .filter(
            AssetPosition.user_id == current_user.id,
            AssetPosition.asset_id == asset.id,
        )
        .first()
    )

    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Você não possui o ativo {ticker}",
        )

    # Get transactions
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.asset_id == asset.id,
        )
        .order_by(Transaction.date.desc())
        .all()
    )

    # Get proceeds
    proceeds = (
        db.query(Proceed)
        .filter(
            Proceed.user_id == current_user.id,
            Proceed.asset_id == asset.id,
        )
        .order_by(Proceed.date.desc())
        .all()
    )

    # Calculate total proceeds
    total_proceeds = sum(p.total_value for p in proceeds)

    return {
        "asset": {
            "id": asset.id,
            "ticker": asset.ticker,
            "name": asset.name,
            "type": asset.type.value,
            "sector": asset.sector,
            "description": asset.description,
        },
        "position": {
            "quantity": position.quantity,
            "average_price": round(position.average_price, 2),
            "current_price": round(position.current_price, 2) if position.current_price else None,
            "total_value": round(position.total_value, 2),
            "total_invested": round(position.total_invested, 2),
            "profit_loss": round(position.profit_loss, 2),
            "profit_loss_percentage": round(position.profit_loss_percentage, 2),
        },
        "transactions": [
            {
                "id": t.id,
                "type": t.type.value,
                "date": t.date.isoformat(),
                "quantity": t.quantity,
                "price": round(t.price, 2),
                "total_amount": round(t.total_amount, 2),
                "fees": round(t.fees, 2) if t.fees else 0.0,
            }
            for t in transactions
        ],
        "proceeds": [
            {
                "id": p.id,
                "type": p.type.value,
                "date": p.date.isoformat(),
                "value_per_share": round(p.value_per_share, 2),
                "quantity": p.quantity,
                "total_value": round(p.total_value, 2),
                "description": p.description,
            }
            for p in proceeds
        ],
        "total_proceeds": round(total_proceeds, 2),
    }

