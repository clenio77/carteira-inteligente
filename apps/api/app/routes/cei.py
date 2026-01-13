"""
CEI Integration routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.cei import CEICredentialsCreate, CEICredentialsResponse, CEISyncStatus
from app.services.cei_service import CEIService
from app.core.logging import logger

router = APIRouter()


@router.post("/connect", response_model=CEISyncStatus, status_code=status.HTTP_201_CREATED)
async def connect_cei(
    credentials: CEICredentialsCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Connect to CEI and start initial synchronization
    
    - **cpf**: User's CPF (with or without formatting)
    - **password**: CEI password
    
    This endpoint will:
    1. Validate credentials with CEI
    2. Store encrypted credentials
    3. Start asynchronous synchronization
    """
    try:
        # Validate credentials
        is_valid = CEIService.validate_credentials(credentials.cpf, credentials.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CPF ou senha inválidos",
            )

        # Save credentials
        CEIService.save_credentials(
            db=db,
            user_id=current_user.id,
            cpf=credentials.cpf,
            password=credentials.password,
        )

        # Start synchronization
        sync_result = CEIService.sync_portfolio(db=db, user_id=current_user.id)

        return CEISyncStatus(
            status="success",
            message="Carteira sincronizada com sucesso",
            assets_synced=sync_result.get("positions_synced", 0),
            transactions_synced=sync_result.get("transactions_synced", 0),
            proceeds_synced=sync_result.get("proceeds_synced", 0),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting to CEI for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao conectar com CEI. Tente novamente mais tarde.",
        )


@router.post("/sync", response_model=CEISyncStatus)
async def sync_cei(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manually trigger CEI synchronization
    
    Synchronizes:
    - Asset positions
    - Transaction history
    - Proceeds (dividends, JCP, etc.)
    """
    try:
        sync_result = CEIService.sync_portfolio(db=db, user_id=current_user.id)

        return CEISyncStatus(
            status="success",
            message="Sincronização concluída",
            assets_synced=sync_result.get("positions_synced", 0),
            transactions_synced=sync_result.get("transactions_synced", 0),
            proceeds_synced=sync_result.get("proceeds_synced", 0),
        )

    except Exception as e:
        logger.error(f"Error syncing CEI for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao sincronizar carteira. Tente novamente.",
        )


@router.get("/status", response_model=CEICredentialsResponse)
async def get_cei_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get CEI connection and sync status
    """
    from app.models.cei_credentials import CEICredentials

    credentials = db.query(CEICredentials).filter(
        CEICredentials.user_id == current_user.id
    ).first()

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CEI não conectado. Use /cei/connect primeiro.",
        )

    # Mask CPF
    cpf_masked = credentials.cpf[:3] + "***" + credentials.cpf[-2:]

    return CEICredentialsResponse(
        id=credentials.id,
        user_id=credentials.user_id,
        cpf=cpf_masked,
        is_active=credentials.is_active,
        last_sync_at=credentials.last_sync_at,
        last_sync_status=credentials.last_sync_status,
        created_at=credentials.created_at,
    )

