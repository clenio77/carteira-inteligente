"""
Portfolio Management Routes

Endpoints for manually adding transactions, positions, and uploading CSV files.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import date, datetime
from pydantic import BaseModel, Field
import csv
import io
import asyncio
import logging

logger = logging.getLogger(__name__)

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.asset import Asset, AssetType
from app.models.transaction import Transaction, TransactionType
from app.models.position import AssetPosition
from app.models.personal_finance import BankAccount, PersonalTransaction, TransactionCategory
from app.models.personal_finance import TransactionType as PFTransactionType

router = APIRouter(prefix="/portfolio/manage", tags=["Portfolio Management"])


# Request/Response Models
class AddTransactionRequest(BaseModel):
    """Request to add a new transaction"""
    ticker: str = Field(..., min_length=3, max_length=60, description="Stock ticker (e.g., PETR4) or Fixed Income Name")
    asset_name: Optional[str] = Field(None, description="Asset name (optional, will be fetched if not provided)")
    asset_type: str = Field("ACAO", description="Asset type: ACAO, FII, ETF, BDR")
    transaction_type: str = Field(..., description="Transaction type: COMPRA or VENDA")
    quantity: int = Field(..., gt=0, description="Number of shares")
    price: float = Field(..., gt=0, description="Price per share")
    transaction_date: date = Field(..., description="Transaction date")
    broker: Optional[str] = Field(None, description="Broker name")
    fees: float = Field(0, ge=0, description="Transaction fees")
    notes: Optional[str] = Field(None, description="Additional notes")
    pf_account_id: Optional[int] = Field(None, description="Personal Finance Account ID to debit/credit")


class TransactionResponse(BaseModel):
    """Transaction response"""
    id: int
    ticker: str
    asset_name: str
    transaction_type: str
    quantity: int
    price: float
    total_amount: float
    fees: float
    transaction_date: str
    created_at: str


class AddTransactionResponse(BaseModel):
    """Response after adding transaction"""
    message: str
    transaction: TransactionResponse
    position_updated: bool


class BulkImportResponse(BaseModel):
    """Response for bulk import"""
    message: str
    transactions_created: int
    transactions_failed: int
    errors: List[str]


class PositionSummary(BaseModel):
    """Position summary after operations"""
    ticker: str
    name: str
    quantity: int
    average_price: float
    total_invested: float



class RebalanceRequest(BaseModel):
    """Rebalance targets by asset type (percentage 0-100)"""
    targets: Dict[str, float] # e.g. {"ACAO": 60.0, "FII": 40.0}


class RebalanceAction(BaseModel):
    """Action for rebalancing"""
    type: str
    current_value: float
    current_percentage: float
    target_percentage: float
    target_value: float
    difference: float # Positive = Buy, Negative = Sell
    action: str # "COMPRAR" or "VENDER" or "MANTER"


class RebalanceResponse(BaseModel):
    """Rebalance plan"""
    total_value: float
    actions: List[RebalanceAction]


# Helper functions
def get_or_create_asset(db: Session, ticker: str, name: Optional[str], asset_type: str) -> Asset:
    """Get existing asset or create a new one"""
    ticker = ticker.upper().strip()
    
    # Try to find existing asset
    asset = db.query(Asset).filter(Asset.ticker == ticker).first()
    
    if not asset:
        # Create new asset
        try:
            type_enum = AssetType(asset_type.upper())
        except ValueError:
            type_enum = AssetType.ACAO
        
        asset = Asset(
            ticker=ticker,
            name=name or ticker,
            type=type_enum,
            sector=None,
            description=None,
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        logger.info(f"Created new asset: {ticker}")
    
    return asset


def update_position(db: Session, user_id: int, asset_id: int) -> Optional[AssetPosition]:
    """
    Recalculate position based on all transactions.
    Uses FIFO method for average price calculation.
    """
    # Get all transactions for this user and asset
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.asset_id == asset_id
    ).order_by(Transaction.date.asc()).all()
    
    if not transactions:
        # Remove position if no transactions
        position = db.query(AssetPosition).filter(
            AssetPosition.user_id == user_id,
            AssetPosition.asset_id == asset_id
        ).first()
        if position:
            db.delete(position)
            db.commit()
        return None
    
    # Calculate position using FIFO
    total_quantity = 0
    total_cost = 0.0
    
    for tx in transactions:
        if tx.type == TransactionType.BUY:
            total_quantity += tx.quantity
            total_cost += (tx.quantity * tx.price) + tx.fees
        elif tx.type == TransactionType.SELL:
            if total_quantity > 0:
                # Calculate average cost per share before sale
                avg_cost = total_cost / total_quantity
                # Reduce position
                sold_cost = avg_cost * tx.quantity
                total_quantity -= tx.quantity
                total_cost -= sold_cost
                total_cost = max(0, total_cost)  # Ensure non-negative
    
    # Get or create position
    position = db.query(AssetPosition).filter(
        AssetPosition.user_id == user_id,
        AssetPosition.asset_id == asset_id
    ).first()
    
    if total_quantity <= 0:
        # Remove position if sold out
        if position:
            db.delete(position)
            db.commit()
        return None
    
    average_price = total_cost / total_quantity if total_quantity > 0 else 0
    
    if not position:
        position = AssetPosition(
            user_id=user_id,
            asset_id=asset_id,
            quantity=total_quantity,
            average_price=average_price,
            current_price=average_price,  # Will be updated by market data
        )
        db.add(position)
    else:
        position.quantity = total_quantity
        position.average_price = average_price
        position.last_updated = datetime.utcnow()
    
    db.commit()
    db.refresh(position)
    return position


# Endpoints
@router.post("/transaction", response_model=AddTransactionResponse)
async def add_transaction(
    request: AddTransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a new transaction (buy or sell).
    
    The position will be automatically recalculated after the transaction.
    """
    # Validate and map transaction type
    tx_type_str = request.transaction_type.upper()
    if tx_type_str == "COMPRA":
        tx_type = TransactionType.BUY
    elif tx_type_str == "VENDA":
        tx_type = TransactionType.SELL
    elif tx_type_str in ["BUY", "SELL"]:
        tx_type = TransactionType(tx_type_str)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transaction type. Use COMPRA or VENDA."
        )
    
    # Get or create asset
    asset = get_or_create_asset(
        db=db,
        ticker=request.ticker,
        name=request.asset_name,
        asset_type=request.asset_type
    )
    
    # Create transaction
    total_amount = request.quantity * request.price
    
    transaction = Transaction(
        user_id=current_user.id,
        asset_id=asset.id,
        type=tx_type,
        date=request.transaction_date,
        quantity=request.quantity,
        price=request.price,
        total_amount=total_amount,
        fees=request.fees,
        broker=request.broker,
    )
    
    # --- Personal Finance Integration ---
    if request.pf_account_id:
        account = db.query(BankAccount).filter(
            BankAccount.id == request.pf_account_id,
            BankAccount.user_id == current_user.id
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Conta bancária selecionada não encontrada.")

        # Try to find 'Investimentos' category
        category = db.query(TransactionCategory).filter(
            TransactionCategory.name == "Investimentos",
            TransactionCategory.user_id == current_user.id
        ).first()
        
        # If not, try find a default one or leave None (or create one?)
        # For now, let's leave None if not found, user can categorize later or we create one on the fly?
        # Let's simple create on the fly if not exists
        if not category:
            category = TransactionCategory(
                user_id=current_user.id,
                name="Investimentos",
                type=PFTransactionType.EXPENSE.value, # Default to Expense? Or creates duplicated?
                # Actually, duplicate categories (Income/Expense) might be an issue if enforcing uniqueness on name.
                # Let's just search by name.
            )
            # Check if name is unique constraint... Model definition from previous turns doesn't strictly imply unique.
            # Let's keep it simple: if not found, just don't set category to avoid errors.
            pass

        pf_desc = f"{'Compra' if tx_type == TransactionType.BUY else 'Venda'} de {request.quantity} {request.ticker}"
        
        if tx_type == TransactionType.BUY:
             pf_amount = total_amount + request.fees
             pf_type = PFTransactionType.EXPENSE
             account.balance -= pf_amount
        else: # SELL
             pf_amount = max(0, total_amount - request.fees)
             pf_type = PFTransactionType.INCOME
             account.balance += pf_amount

        pf_tx = PersonalTransaction(
            user_id=current_user.id,
            account_id=account.id,
            category_id=category.id if category else None,
            type=pf_type.value,
            amount=pf_amount,
            description=pf_desc,
            date=request.transaction_date,
            is_paid=True
        )
        db.add(pf_tx)
        
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # Update position
    position = update_position(db, current_user.id, asset.id)
    
    logger.info(
        f"User {current_user.id} added transaction: "
        f"{tx_type.value} {request.quantity} {asset.ticker} @ R${request.price}"
    )
    
    return AddTransactionResponse(
        message=f"Transação adicionada com sucesso!",
        transaction=TransactionResponse(
            id=transaction.id,
            ticker=asset.ticker,
            asset_name=asset.name,
            transaction_type="COMPRA" if tx_type == TransactionType.BUY else "VENDA",
            quantity=transaction.quantity,
            price=transaction.price,
            total_amount=transaction.total_amount,
            fees=transaction.fees,
            transaction_date=transaction.date.isoformat(),
            created_at=transaction.created_at.isoformat(),
        ),
        position_updated=position is not None,
    )


@router.post("/upload-csv", response_model=BulkImportResponse)
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a CSV file with transactions.
    
    Expected CSV format:
    ```
    ticker,tipo,quantidade,preco,data,taxas
    PETR4,COMPRA,100,28.50,2024-01-15,5.00
    VALE3,COMPRA,50,65.00,2024-01-20,5.00
    ITUB4,VENDA,30,32.00,2024-02-01,5.00
    ```
    
    Columns:
    - ticker: Stock ticker (required)
    - tipo: COMPRA or VENDA (required)
    - quantidade: Number of shares (required)
    - preco: Price per share (required)
    - data: Date in YYYY-MM-DD format (required)
    - taxas: Fees (optional, defaults to 0)
    - nome: Asset name (optional)
    - tipo_ativo: ACAO, FII, ETF, BDR (optional, defaults to ACAO)
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8')
        
        # Try to detect delimiter
        sample = decoded[:1000]
        delimiter = ';' if ';' in sample else ','
        
        reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
        
        transactions_created = 0
        transactions_failed = 0
        errors = []
        affected_assets = set()
        
        for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is 1)
            try:
                # Normalize column names (lowercase, strip)
                row = {k.lower().strip(): v.strip() if v else '' for k, v in row.items()}
                
                # Required fields
                ticker = row.get('ticker', '').upper()
                if not ticker:
                    raise ValueError("Ticker é obrigatório")
                
                tipo = row.get('tipo', '').upper()
                if tipo not in ['COMPRA', 'VENDA']:
                    raise ValueError(f"Tipo deve ser COMPRA ou VENDA, recebido: {tipo}")
                
                quantidade = int(row.get('quantidade', 0))
                if quantidade <= 0:
                    raise ValueError("Quantidade deve ser maior que 0")
                
                preco = float(row.get('preco', '0').replace(',', '.'))
                if preco <= 0:
                    raise ValueError("Preço deve ser maior que 0")
                
                data_str = row.get('data', '')
                try:
                    data = datetime.strptime(data_str, '%Y-%m-%d').date()
                except ValueError:
                    try:
                        data = datetime.strptime(data_str, '%d/%m/%Y').date()
                    except ValueError:
                        raise ValueError(f"Data inválida: {data_str}. Use YYYY-MM-DD ou DD/MM/YYYY")
                
                # Optional fields
                taxas = float(row.get('taxas', '0').replace(',', '.'))
                nome = row.get('nome', None)
                tipo_ativo = row.get('tipo_ativo', 'ACAO').upper()
                
                # Get or create asset
                asset = get_or_create_asset(db, ticker, nome, tipo_ativo)
                
                # Create transaction
                tx_type = TransactionType.BUY if tipo == 'COMPRA' else TransactionType.SELL
                total_amount = quantidade * preco
                
                transaction = Transaction(
                    user_id=current_user.id,
                    asset_id=asset.id,
                    type=tx_type,
                    date=data,
                    quantity=quantidade,
                    price=preco,
                    total_amount=total_amount,
                    fees=taxas,
                )
                
                db.add(transaction)
                transactions_created += 1
                affected_assets.add(asset.id)
                
            except Exception as e:
                transactions_failed += 1
                errors.append(f"Linha {row_num}: {str(e)}")
                continue
        
        db.commit()
        
        # Update positions for all affected assets
        for asset_id in affected_assets:
            update_position(db, current_user.id, asset_id)
        
        logger.info(
            f"User {current_user.id} imported CSV: "
            f"{transactions_created} created, {transactions_failed} failed"
        )
        
        message = f"Importação concluída! {transactions_created} transações importadas."
        if transactions_failed > 0:
            message += f" {transactions_failed} falharam."
        
        return BulkImportResponse(
            message=message,
            transactions_created=transactions_created,
            transactions_failed=transactions_failed,
            errors=errors[:10],  # Limit to first 10 errors
        )
        
    except Exception as e:
        logger.error(f"Error processing CSV: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erro ao processar arquivo: {str(e)}")


@router.post("/analyze-note")
async def analyze_note(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)  # kept for future use if storing analysis history
):
    """
    Analyze a brokerage note using Gemini AI.
    Accepts images (PNG, JPG) or PDF.
    Returns parsed transaction data.
    """
    if file.content_type not in ["application/pdf", "image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use PDF ou Imagem.")
    
    # Read file content
    content = await file.read()
    
    try:
        from app.services.gemini_service import gemini_service
        
        result = await gemini_service.analyze_brokerage_note(content, file.content_type)
        return result
        
    except ValueError as ve:
         raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Falha na análise: {str(e)}")


@router.get("/transactions", response_model=List[TransactionResponse])
async def list_transactions(
    ticker: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List user transactions.
    
    Optionally filter by ticker and limit results.
    """
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if ticker:
        asset = db.query(Asset).filter(Asset.ticker == ticker.upper()).first()
        if asset:
            query = query.filter(Transaction.asset_id == asset.id)
    
    transactions = query.order_by(Transaction.date.desc()).limit(limit).all()
    
    result = []
    for tx in transactions:
        asset = db.query(Asset).filter(Asset.id == tx.asset_id).first()
        result.append(TransactionResponse(
            id=tx.id,
            ticker=asset.ticker if asset else "UNKNOWN",
            asset_name=asset.name if asset else "Unknown",
            transaction_type="COMPRA" if tx.type == TransactionType.BUY else "VENDA",
            quantity=tx.quantity,
            price=tx.price,
            total_amount=tx.total_amount,
            fees=tx.fees,
            transaction_date=tx.date.isoformat(),
            created_at=tx.created_at.isoformat(),
        ))
    
    return result


@router.delete("/transaction/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a transaction.
    
    The position will be recalculated after deletion.
    """
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    asset_id = transaction.asset_id
    
    db.delete(transaction)
    db.commit()
    
    # Recalculate position
    update_position(db, current_user.id, asset_id)
    
    return {"message": "Transaction deleted successfully"}


@router.get("/positions", response_model=List[PositionSummary])
async def get_positions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all current positions for the user.
    """
    positions = db.query(AssetPosition).filter(
        AssetPosition.user_id == current_user.id
    ).all()
    
    result = []
    for pos in positions:
        asset = db.query(Asset).filter(Asset.id == pos.asset_id).first()
        if asset:
            result.append(PositionSummary(
                ticker=asset.ticker,
                name=asset.name,
                quantity=pos.quantity,
                average_price=pos.average_price,
                total_invested=pos.quantity * pos.average_price,
            ))
    
    return result


@router.get("/csv-template")
async def get_csv_template():
    """
    Get a sample CSV template for importing transactions.
    """
    return {
        "description": "Template para importação de transações via CSV",
        "columns": {
            "ticker": "Código do ativo (ex: PETR4)",
            "tipo": "Tipo da operação: COMPRA ou VENDA",
            "quantidade": "Quantidade de ações/cotas",
            "preco": "Preço por ação/cota",
            "data": "Data da operação (YYYY-MM-DD ou DD/MM/YYYY)",
            "taxas": "Taxas/custos (opcional)",
            "nome": "Nome do ativo (opcional)",
            "tipo_ativo": "Tipo: ACAO, FII, ETF, BDR (opcional, padrão: ACAO)",
        },
        "example": """ticker,tipo,quantidade,preco,data,taxas
PETR4,COMPRA,100,28.50,2024-01-15,5.00
VALE3,COMPRA,50,65.00,2024-01-20,5.00
HGLG11,COMPRA,10,150.00,2024-02-01,0
ITUB4,VENDA,30,32.00,2024-02-15,5.00""",
        "notes": [
            "O arquivo pode usar vírgula (,) ou ponto e vírgula (;) como separador",
            "Use ponto (.) como separador decimal",
            "A primeira linha deve conter os nomes das colunas",
        ],
    }


# =============================================================================
# PRICE UPDATE ENDPOINTS
# =============================================================================

class PriceUpdateResponse(BaseModel):
    """Response for price update"""
    success: bool
    message: str
    updated_count: int
    failed_count: int
    updated_assets: List[dict]
    failed_assets: List[dict]


@router.get("/sync_prices", response_model=PriceUpdateResponse)
async def sync_portfolio_prices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update current prices (Sync) for all assets in user's portfolio.
    Changed to GET to avoid 405 Method Not Allowed issues on some proxies.
    """
    from app.services.brapi_service import BrapiService
    
    # Get all user positions with assets
    positions = (
        db.query(AssetPosition)
        .join(Asset)
        .filter(AssetPosition.user_id == current_user.id)
        .filter(AssetPosition.quantity > 0)
        .all()
    )
    
    if not positions:
        return PriceUpdateResponse(
            success=True,
            message="Nenhuma posição encontrada para atualizar",
            updated_count=0,
            failed_count=0,
            updated_assets=[],
            failed_assets=[],
        )
    
    # Get unique tickers
    tickers = []
    ticker_to_positions = {}
    
    for position in positions:
        asset = db.query(Asset).filter(Asset.id == position.asset_id).first()
        if asset:
            # Skip price updates for Fixed Income assets (handled manually or via different service)
            if asset.type == AssetType.RENDA_FIXA:
                continue
                
            ticker = asset.ticker
            tickers.append(ticker)
            if ticker not in ticker_to_positions:
                ticker_to_positions[ticker] = []
            ticker_to_positions[ticker].append(position)
    
    updated_assets = []
    failed_assets = []
    
    # Get unique tickers (remove duplicates)
    unique_tickers = list(set(tickers))
    
    # Batch fetch prices using get_quotes (which handles batching, caching, and fallbacks)
    try:
        # This single call replaces the slow sequential loop
        result = await BrapiService.get_quotes(unique_tickers)
        
        if result["success"]:
            quotes_data = {q["ticker"]: q for q in result["data"]}
            
            for ticker in unique_tickers:
                if ticker in quotes_data:
                    data = quotes_data[ticker]
                    price = data.get("price")
                    
                    if price is not None:
                        # Update all positions for this ticker
                        if ticker in ticker_to_positions:
                            for position in ticker_to_positions[ticker]:
                                old_price = position.current_price
                                position.current_price = price
                                position.last_updated = datetime.utcnow()
                                
                                updated_assets.append({
                                    "ticker": ticker,
                                    "old_price": old_price,
                                    "new_price": price,
                                    "change": data.get("change_percent"),
                                })
                    else:
                        failed_assets.append({
                            "ticker": ticker,
                            "error": "Price is null",
                        })
                else:
                    failed_assets.append({
                        "ticker": ticker,
                        "error": "Not found in batch response",
                    })
        else:
            # If the entire batch failed (unlikely with fallback)
            for ticker in unique_tickers:
                failed_assets.append({
                    "ticker": ticker,
                    "error": result.get("error", "Unknown error"),
                })
                
    except Exception as e:
        logger.error(f"Error updating portfolio prices: {str(e)}")
        # Mark all as failed if global exception
        for ticker in unique_tickers:
             if not any(f["ticker"] == ticker for f in updated_assets):
                failed_assets.append({
                    "ticker": ticker,
                    "error": str(e),
                })
    
    # Commit all changes
    db.commit()
    
    # Build response message
    success = len(failed_assets) == 0
    if len(updated_assets) > 0 and len(failed_assets) > 0:
        message = f"Atualizados {len(updated_assets)} ativos, {len(failed_assets)} falharam"
    elif len(updated_assets) > 0:
        message = f"Todos os {len(updated_assets)} ativos foram atualizados com sucesso!"
    else:
        message = "Nenhum ativo foi atualizado"
    
    logger.info(f"Price update for user {current_user.id}: {message}")
    
    return PriceUpdateResponse(
        success=success,
        message=message,
        updated_count=len(updated_assets),
        failed_count=len(failed_assets),
        updated_assets=updated_assets,
        failed_assets=failed_assets,
    )


@router.post("/rebalance", response_model=RebalanceResponse)
async def calculate_rebalancing(
    request: RebalanceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculate rebalancing plan based on target percentages.
    """
    # 1. Get current portfolio state
    positions = (
        db.query(AssetPosition)
        .join(Asset)
        .filter(AssetPosition.user_id == current_user.id)
        .all()
    )
    
    total_value = sum(p.total_value for p in positions)
    current_allocation = {}
    
    for p in positions:
        asset = db.query(Asset).filter(Asset.id == p.asset_id).first()
        atype = asset.type.value
        current_allocation[atype] = current_allocation.get(atype, 0.0) + p.total_value
        
    # 2. Calculate actions
    actions = []
    
    # Process all types present in either target or current
    all_types = set(list(current_allocation.keys()) + list(request.targets.keys()))
    
    for atype in all_types:
        current_val = current_allocation.get(atype, 0.0)
        current_pct = (current_val / total_value * 100) if total_value > 0 else 0.0
        
        target_pct = request.targets.get(atype, 0.0)
        target_val = (target_pct / 100) * total_value
        
        diff = target_val - current_val
        
        action_str = "MANTER"
        if diff > 1.0: # Tolerance
            action_str = "COMPRAR"
        elif diff < -1.0:
            action_str = "VENDER"
            
        actions.append(RebalanceAction(
            type=atype,
            current_value=round(current_val, 2),
            current_percentage=round(current_pct, 2),
            target_percentage=target_pct,
            target_value=round(target_val, 2),
            difference=round(diff, 2),
            action=action_str
        ))
        
    return RebalanceResponse(
        total_value=round(total_value, 2),
        actions=actions
    )


@router.get("/prices-status")
async def get_prices_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get status of current prices for all portfolio assets.
    
    Returns information about which assets have current prices and when they were last updated.
    """
    positions = (
        db.query(AssetPosition)
        .join(Asset)
        .filter(AssetPosition.user_id == current_user.id)
        .filter(AssetPosition.quantity > 0)
        .all()
    )
    
    assets_status = []
    for position in positions:
        asset = db.query(Asset).filter(Asset.id == position.asset_id).first()
        if asset:
            assets_status.append({
                "ticker": asset.ticker,
                "name": asset.name,
                "has_current_price": position.current_price is not None,
                "current_price": position.current_price,
                "average_price": position.average_price,
                "last_updated": position.last_updated.isoformat() if position.last_updated else None,
                "needs_update": position.current_price is None or position.current_price == position.average_price,
            })
    
    # Count assets needing update
    needs_update = sum(1 for a in assets_status if a["needs_update"])
    
    return {
        "total_assets": len(assets_status),
        "with_current_price": len(assets_status) - needs_update,
        "needs_update": needs_update,
        "assets": assets_status,
    }


# ================================
# PROVENTOS (Dividends/JCP) Management
# ================================

from app.models.proceed import Proceed, ProceedType


class AddProceedRequest(BaseModel):
    """Request to add a new proceed (dividend/JCP)"""
    ticker: str = Field(..., min_length=3, max_length=20, description="Asset ticker")
    proceed_type: str = Field(..., description="Type: DIVIDEND, JCP, RENDIMENTO, BONIFICACAO, DIREITO")
    proceed_date: date = Field(..., description="Payment date")
    value_per_share: float = Field(..., gt=0, description="Value per share")
    quantity: float = Field(..., gt=0, description="Number of shares that received payment")
    description: Optional[str] = Field(None, description="Optional description")


class ProceedResponse(BaseModel):
    """Proceed response"""
    id: int
    ticker: str
    asset_name: str
    proceed_type: str
    proceed_date: str
    value_per_share: float
    quantity: float
    total_value: float
    description: Optional[str]

    class Config:
        from_attributes = True


@router.post("/proceeds", response_model=Dict)
async def add_proceed(
    request: AddProceedRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a new proceed (dividend, JCP, etc.)
    
    Manually register income received from an asset.
    """
    # Find or create asset
    asset = db.query(Asset).filter(Asset.ticker == request.ticker.upper()).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Asset {request.ticker} not found. Please add the asset first."
        )
    
    # Validate proceed type
    try:
        proceed_type = ProceedType[request.proceed_type.upper()]
    except KeyError:
        valid_types = [t.name for t in ProceedType]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid proceed type. Valid types: {valid_types}"
        )
    
    # Calculate total value
    total_value = request.value_per_share * request.quantity
    
    # Create proceed
    proceed = Proceed(
        user_id=current_user.id,
        asset_id=asset.id,
        type=proceed_type,
        date=request.proceed_date,
        value_per_share=request.value_per_share,
        quantity=request.quantity,
        total_value=total_value,
        description=request.description
    )
    
    db.add(proceed)
    db.commit()
    db.refresh(proceed)
    
    logger.info(f"User {current_user.id} added proceed: {asset.ticker} - {proceed_type.value} - R${total_value:.2f}")
    
    return {
        "success": True,
        "message": f"Provento de {asset.ticker} cadastrado com sucesso",
        "proceed": {
            "id": proceed.id,
            "ticker": asset.ticker,
            "asset_name": asset.name or asset.ticker,
            "proceed_type": proceed_type.value,
            "proceed_date": request.proceed_date.isoformat(),
            "value_per_share": request.value_per_share,
            "quantity": request.quantity,
            "total_value": total_value,
        }
    }


@router.get("/proceeds")
async def list_proceeds(
    ticker: Optional[str] = None,
    proceed_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List user's proceeds with optional filters
    """
    query = db.query(Proceed).filter(Proceed.user_id == current_user.id)
    
    if ticker:
        asset = db.query(Asset).filter(Asset.ticker == ticker.upper()).first()
        if asset:
            query = query.filter(Proceed.asset_id == asset.id)
    
    if proceed_type:
        try:
            pt = ProceedType[proceed_type.upper()]
            query = query.filter(Proceed.type == pt)
        except KeyError:
            pass
    
    if start_date:
        query = query.filter(Proceed.date >= start_date)
    
    if end_date:
        query = query.filter(Proceed.date <= end_date)
    
    proceeds = query.order_by(Proceed.date.desc()).limit(limit).all()
    
    # Calculate totals
    total_value = sum(p.total_value for p in proceeds)
    
    # Get totals by type
    totals_by_type = {}
    for p in proceeds:
        type_name = p.type.value
        totals_by_type[type_name] = totals_by_type.get(type_name, 0) + p.total_value
    
    # Format response
    proceeds_list = []
    for p in proceeds:
        asset = db.query(Asset).filter(Asset.id == p.asset_id).first()
        proceeds_list.append({
            "id": p.id,
            "ticker": asset.ticker if asset else "N/A",
            "asset_name": asset.name if asset else "N/A",
            "proceed_type": p.type.value,
            "proceed_date": p.date.isoformat(),
            "value_per_share": p.value_per_share,
            "quantity": p.quantity,
            "total_value": p.total_value,
            "description": p.description,
        })
    
    return {
        "proceeds": proceeds_list,
        "total_count": len(proceeds_list),
        "total_value": round(total_value, 2),
        "totals_by_type": {k: round(v, 2) for k, v in totals_by_type.items()},
    }


@router.delete("/proceeds/{proceed_id}")
async def delete_proceed(
    proceed_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a proceed
    """
    proceed = db.query(Proceed).filter(
        Proceed.id == proceed_id,
        Proceed.user_id == current_user.id
    ).first()
    
    if not proceed:
        raise HTTPException(status_code=404, detail="Proceed not found")
    
    db.delete(proceed)
    db.commit()
    
    return {"success": True, "message": "Provento excluído com sucesso"}


@router.get("/proceeds/summary")
async def get_proceeds_summary(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a summary of proceeds by month and asset
    """
    query = db.query(Proceed).filter(Proceed.user_id == current_user.id)
    
    if year:
        from sqlalchemy import extract
        query = query.filter(extract('year', Proceed.date) == year)
    
    proceeds = query.order_by(Proceed.date).all()
    
    # Group by month
    months = {}
    for p in proceeds:
        month_key = p.date.strftime("%Y-%m")
        if month_key not in months:
            months[month_key] = {"total": 0, "count": 0}
        months[month_key]["total"] += p.total_value
        months[month_key]["count"] += 1
    
    # Group by asset
    assets = {}
    for p in proceeds:
        asset = db.query(Asset).filter(Asset.id == p.asset_id).first()
        ticker = asset.ticker if asset else "N/A"
        if ticker not in assets:
            assets[ticker] = {"total": 0, "count": 0}
        assets[ticker]["total"] += p.total_value
        assets[ticker]["count"] += 1
    
    # Sort by total
    sorted_assets = sorted(assets.items(), key=lambda x: x[1]["total"], reverse=True)
    
    return {
        "by_month": [{"month": k, "total": round(v["total"], 2), "count": v["count"]} for k, v in sorted(months.items())],
        "by_asset": [{"ticker": k, "total": round(v["total"], 2), "count": v["count"]} for k, v in sorted_assets],
        "total": round(sum(p.total_value for p in proceeds), 2),
        "total_count": len(proceeds),
    }

