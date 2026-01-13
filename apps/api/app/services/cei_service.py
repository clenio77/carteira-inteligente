"""
CEI Integration Service

NOTE: This is a MOCK implementation for demonstration purposes.
In production, this would use real CEI B3 scraping/API integration.
"""
import random
from datetime import datetime, timedelta, date
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.asset import Asset, AssetType
from app.models.position import AssetPosition
from app.models.transaction import Transaction, TransactionType
from app.models.proceed import Proceed, ProceedType
from app.models.cei_credentials import CEICredentials
from app.core.security import get_password_hash
from app.core.logging import logger
from app.services.notification_service import NotificationService


class CEIService:
    """Service for integrating with B3 CEI (Mock Implementation)"""

    # Mock assets database
    MOCK_ASSETS = [
        {"ticker": "PETR4", "name": "Petrobras PN", "type": AssetType.ACAO, "sector": "Energia"},
        {"ticker": "VALE3", "name": "Vale ON", "type": AssetType.ACAO, "sector": "Mineração"},
        {"ticker": "ITUB4", "name": "Itaú Unibanco PN", "type": AssetType.ACAO, "sector": "Financeiro"},
        {"ticker": "BBDC4", "name": "Bradesco PN", "type": AssetType.ACAO, "sector": "Financeiro"},
        {"ticker": "ABEV3", "name": "Ambev ON", "type": AssetType.ACAO, "sector": "Consumo"},
        {"ticker": "BBAS3", "name": "Banco do Brasil ON", "type": AssetType.ACAO, "sector": "Financeiro"},
        {"ticker": "HGLG11", "name": "CSHG Logística FII", "type": AssetType.FII, "sector": "Logística"},
        {"ticker": "MXRF11", "name": "Maxi Renda FII", "type": AssetType.FII, "sector": "Híbrido"},
        {"ticker": "IVVB11", "name": "iShares S&P 500 ETF", "type": AssetType.ETF, "sector": "Internacional"},
    ]

    @staticmethod
    def validate_credentials(cpf: str, password: str) -> bool:
        """
        Validate CEI credentials (Mock)
        
        In production: Actually login to CEI and validate
        For demo: Accept any CPF with 11 digits and any password
        """
        # Remove formatting
        cpf_clean = cpf.replace(".", "").replace("-", "")
        
        # Basic validation
        if len(cpf_clean) != 11:
            return False
        if len(password) < 1:
            return False
        
        # Mock: Always valid (in production, would actually try to login to CEI)
        return True

    @staticmethod
    def save_credentials(db: Session, user_id: int, cpf: str, password: str) -> CEICredentials:
        """
        Save encrypted CEI credentials
        """
        # Check if credentials already exist
        existing = db.query(CEICredentials).filter(
            CEICredentials.user_id == user_id
        ).first()

        # Encrypt password
        encrypted_password = get_password_hash(password)

        if existing:
            # Update existing
            existing.cpf = cpf
            existing.encrypted_password = encrypted_password
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            logger.info(f"Updated CEI credentials for user {user_id}")
            return existing
        else:
            # Create new
            credentials = CEICredentials(
                user_id=user_id,
                cpf=cpf,
                encrypted_password=encrypted_password,
                is_active=True,
            )
            db.add(credentials)
            db.commit()
            db.refresh(credentials)
            logger.info(f"Created CEI credentials for user {user_id}")
            return credentials

    @staticmethod
    def sync_portfolio(db: Session, user_id: int) -> Dict[str, Any]:
        """
        Synchronize portfolio data from CEI (Mock Implementation)
        
        Returns:
            Dictionary with sync statistics
        """
        logger.info(f"Starting CEI sync for user {user_id}")

        try:
            # Update sync status
            credentials = db.query(CEICredentials).filter(
                CEICredentials.user_id == user_id
            ).first()

            if not credentials:
                raise Exception("CEI credentials not found")

            credentials.last_sync_status = "running"
            db.commit()

            # 1. Ensure assets exist in database
            assets_created = CEIService._ensure_assets_exist(db)

            # 2. Generate mock transactions (last 6 months)
            transactions_synced = CEIService._generate_mock_transactions(db, user_id)

            # 3. Calculate positions from transactions
            positions_synced = CEIService._calculate_positions(db, user_id)

            # 4. Generate mock proceeds (dividends, etc.)
            proceeds_synced = CEIService._generate_mock_proceeds(db, user_id)

            # 5. Update prices (mock current prices)
            CEIService._update_current_prices(db)

            # 6. Generate notifications for upcoming dividends
            notifications_created = NotificationService.generate_upcoming_dividend_notifications(
                db=db,
                user_id=user_id,
                days_ahead=7
            )

            # Update sync status as success
            credentials.last_sync_status = "success"
            credentials.last_sync_at = datetime.utcnow()
            credentials.last_sync_error = None
            db.commit()

            # Send sync success notification
            NotificationService.create_sync_notification(
                db=db,
                user_id=user_id,
                success=True,
                message=f"Sincronização concluída com sucesso. {positions_synced} posições atualizadas, {proceeds_synced} proventos sincronizados."
            )

            logger.info(f"CEI sync completed for user {user_id}")

            return {
                "status": "success",
                "assets_created": assets_created,
                "transactions_synced": transactions_synced,
                "positions_synced": positions_synced,
                "proceeds_synced": proceeds_synced,
                "notifications_created": len(notifications_created) + 1,  # +1 for sync notification
            }

        except Exception as e:
            # Update sync status as error
            if credentials:
                credentials.last_sync_status = "error"
                credentials.last_sync_error = str(e)
                db.commit()

            # Send sync error notification
            NotificationService.create_sync_notification(
                db=db,
                user_id=user_id,
                success=False,
                message=f"Erro na sincronização: {str(e)[:100]}"
            )

            logger.error(f"CEI sync failed for user {user_id}: {str(e)}")
            raise

    @staticmethod
    def _ensure_assets_exist(db: Session) -> int:
        """Ensure mock assets exist in database"""
        count = 0
        for asset_data in CEIService.MOCK_ASSETS:
            existing = db.query(Asset).filter(
                Asset.ticker == asset_data["ticker"]
            ).first()

            if not existing:
                asset = Asset(**asset_data)
                db.add(asset)
                count += 1

        db.commit()
        return count

    @staticmethod
    def _generate_mock_transactions(db: Session, user_id: int) -> int:
        """Generate mock buy transactions"""
        # Check if user already has transactions
        existing_count = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).count()

        if existing_count > 0:
            # Don't duplicate transactions
            return 0

        # Generate random transactions for user
        assets = db.query(Asset).limit(6).all()  # Use first 6 assets
        transactions_created = 0

        for asset in assets:
            # Create 2-4 buy transactions per asset (last 6 months)
            num_transactions = random.randint(2, 4)

            for i in range(num_transactions):
                days_ago = random.randint(30, 180)
                transaction_date = datetime.utcnow() - timedelta(days=days_ago)
                
                quantity = random.randint(10, 100)
                price = random.uniform(10.0, 100.0)
                total = quantity * price
                fees = total * 0.003  # 0.3% fees

                transaction = Transaction(
                    user_id=user_id,
                    asset_id=asset.id,
                    type=TransactionType.BUY,
                    date=transaction_date,
                    quantity=quantity,
                    price=price,
                    total_amount=total,
                    fees=fees,
                    broker="Corretora Mock",
                )
                db.add(transaction)
                transactions_created += 1

        db.commit()
        return transactions_created

    @staticmethod
    def _calculate_positions(db: Session, user_id: int) -> int:
        """Calculate current positions from transactions"""
        # Delete existing positions
        db.query(AssetPosition).filter(AssetPosition.user_id == user_id).delete()

        # Get all user transactions
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).all()

        # Group by asset and calculate positions
        positions_data = {}

        for trans in transactions:
            if trans.asset_id not in positions_data:
                positions_data[trans.asset_id] = {
                    "quantity": 0.0,
                    "total_invested": 0.0,
                }

            if trans.type == TransactionType.BUY:
                positions_data[trans.asset_id]["quantity"] += trans.quantity
                positions_data[trans.asset_id]["total_invested"] += trans.total_amount
            else:  # SELL
                positions_data[trans.asset_id]["quantity"] -= trans.quantity
                positions_data[trans.asset_id]["total_invested"] -= trans.total_amount

        # Create positions
        positions_created = 0
        for asset_id, data in positions_data.items():
            if data["quantity"] > 0:  # Only create if still owns
                average_price = data["total_invested"] / data["quantity"]

                position = AssetPosition(
                    user_id=user_id,
                    asset_id=asset_id,
                    quantity=data["quantity"],
                    average_price=average_price,
                )
                db.add(position)
                positions_created += 1

        db.commit()
        return positions_created

    @staticmethod
    def _generate_mock_proceeds(db: Session, user_id: int) -> int:
        """Generate mock proceeds (dividends)"""
        # Check if user already has proceeds
        existing_count = db.query(Proceed).filter(
            Proceed.user_id == user_id
        ).count()

        if existing_count > 0:
            return 0

        # Generate proceeds for user's positions
        positions = db.query(AssetPosition).filter(
            AssetPosition.user_id == user_id
        ).all()

        proceeds_created = 0

        for position in positions:
            # Generate 1-3 proceed payments (last 6 months)
            num_proceeds = random.randint(1, 3)

            for _ in range(num_proceeds):
                days_ago = random.randint(30, 180)
                proceed_date = date.today() - timedelta(days=days_ago)
                
                value_per_share = random.uniform(0.50, 2.50)
                total_value = value_per_share * position.quantity

                # Determine proceed type based on asset type
                asset = db.query(Asset).filter(Asset.id == position.asset_id).first()
                if asset.type == AssetType.FII:
                    proceed_type = ProceedType.RENDIMENTO
                else:
                    proceed_type = random.choice([ProceedType.DIVIDEND, ProceedType.JCP])

                proceed = Proceed(
                    user_id=user_id,
                    asset_id=position.asset_id,
                    type=proceed_type,
                    date=proceed_date,
                    value_per_share=value_per_share,
                    quantity=position.quantity,
                    total_value=total_value,
                    description=f"{proceed_type.value} - {asset.ticker}",
                )
                db.add(proceed)
                proceeds_created += 1

        db.commit()
        return proceeds_created

    @staticmethod
    def _update_current_prices(db: Session):
        """
        Update current prices for all positions.
        
        First tries to get real prices from brapi.dev API.
        Falls back to mock data if API fails or asset not available.
        """
        import asyncio
        from app.services.brapi_service import BrapiService
        from app.models.asset import Asset
        
        positions = db.query(AssetPosition).all()
        
        if not positions:
            return
        
        # Get all tickers for positions
        asset_ids = [p.asset_id for p in positions]
        assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
        ticker_map = {a.id: a.ticker for a in assets}
        tickers = list(ticker_map.values())
        
        # Try to get real prices from brapi.dev
        real_prices = {}
        try:
            # Run async function synchronously
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            real_prices = loop.run_until_complete(
                BrapiService.update_position_prices(tickers)
            )
            loop.close()
            logger.info(f"Fetched real prices for {len(real_prices)} tickers from brapi.dev")
        except Exception as e:
            logger.warning(f"Failed to fetch real prices from brapi.dev: {e}. Using mock data.")
        
        for position in positions:
            ticker = ticker_map.get(position.asset_id, "")
            real_price = real_prices.get(ticker)
            
            if real_price is not None:
                # Use real price from brapi.dev
                position.current_price = round(real_price, 2)
                logger.debug(f"Updated {ticker} with real price: R$ {real_price:.2f}")
            else:
                # Fallback to mock: current price is average price +/- 20%
                variation = random.uniform(-0.20, 0.30)  # Slightly positive bias
                current_price = position.average_price * (1 + variation)
                position.current_price = round(current_price, 2)
                logger.debug(f"Updated {ticker} with mock price: R$ {current_price:.2f}")
        
        db.commit()

