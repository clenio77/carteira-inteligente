"""
Tests for portfolio API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from app.models.asset import Asset, AssetType
from app.models.position import AssetPosition
from app.models.transaction import Transaction, TransactionType
from app.models.proceed import Proceed, ProceedType
from datetime import datetime, date, timedelta


def test_get_portfolio_overview_empty(client: TestClient, auth_headers: dict):
    """Test getting portfolio overview when user has no positions"""
    response = client.get("/portfolio/overview", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_value"] == 0.0
    assert data["total_invested"] == 0.0
    assert data["profit_loss"] == 0.0
    assert data["positions_count"] == 0


def test_get_portfolio_overview_with_positions(client: TestClient, auth_headers: dict, db, test_user):
    """Test getting portfolio overview with actual positions"""
    # Create assets
    asset1 = Asset(ticker="PETR4", name="Petrobras PN", type=AssetType.ACAO, sector="Energia")
    asset2 = Asset(ticker="VALE3", name="Vale ON", type=AssetType.ACAO, sector="Mineração")
    db.add(asset1)
    db.add(asset2)
    db.commit()
    db.refresh(asset1)
    db.refresh(asset2)
    
    # Create positions
    position1 = AssetPosition(
        user_id=test_user.id,
        asset_id=asset1.id,
        quantity=100,
        average_price=25.0,
        current_price=30.0
    )
    position2 = AssetPosition(
        user_id=test_user.id,
        asset_id=asset2.id,
        quantity=50,
        average_price=60.0,
        current_price=65.0
    )
    db.add(position1)
    db.add(position2)
    db.commit()
    
    # Get overview
    response = client.get("/portfolio/overview", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Total value: (100 * 30) + (50 * 65) = 6250
    assert data["total_value"] == 6250.0
    # Total invested: (100 * 25) + (50 * 60) = 5500
    assert data["total_invested"] == 5500.0
    # Profit: 6250 - 5500 = 750
    assert data["profit_loss"] == 750.0
    # Profit %: (750 / 5500) * 100 ≈ 13.64%
    assert abs(data["profit_loss_percentage"] - 13.64) < 0.1
    assert data["positions_count"] == 2
    
    # Check allocation
    assert len(data["allocation_by_type"]) > 0
    assert len(data["top_positions"]) == 2


def test_get_portfolio_assets_empty(client: TestClient, auth_headers: dict):
    """Test getting assets list when user has no positions"""
    response = client.get("/portfolio/assets", headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json() == []


def test_get_portfolio_assets_with_positions(client: TestClient, auth_headers: dict, db, test_user):
    """Test getting assets list with positions"""
    # Create asset and position
    asset = Asset(ticker="ITUB4", name="Itaú Unibanco PN", type=AssetType.ACAO, sector="Financeiro")
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    position = AssetPosition(
        user_id=test_user.id,
        asset_id=asset.id,
        quantity=200,
        average_price=28.0,
        current_price=32.0
    )
    db.add(position)
    db.commit()
    
    # Get assets
    response = client.get("/portfolio/assets", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["asset"]["ticker"] == "ITUB4"
    assert data[0]["quantity"] == 200
    assert data[0]["average_price"] == 28.0
    assert data[0]["current_price"] == 32.0


def test_get_asset_detail_not_found(client: TestClient, auth_headers: dict):
    """Test getting detail of non-existent asset"""
    response = client.get("/portfolio/assets/INVALID4", headers=auth_headers)
    
    assert response.status_code == 404


def test_get_asset_detail_with_transactions_and_proceeds(client: TestClient, auth_headers: dict, db, test_user):
    """Test getting asset detail with full history"""
    # Create asset
    asset = Asset(ticker="BBDC4", name="Bradesco PN", type=AssetType.ACAO, sector="Financeiro")
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    # Create transactions
    transaction1 = Transaction(
        user_id=test_user.id,
        asset_id=asset.id,
        type=TransactionType.BUY,
        date=datetime.now() - timedelta(days=30),
        quantity=100,
        price=15.0,
        total_amount=1500.0,
        fees=5.0
    )
    transaction2 = Transaction(
        user_id=test_user.id,
        asset_id=asset.id,
        type=TransactionType.BUY,
        date=datetime.now() - timedelta(days=15),
        quantity=50,
        price=16.0,
        total_amount=800.0,
        fees=3.0
    )
    db.add(transaction1)
    db.add(transaction2)
    
    # Create proceeds
    proceed = Proceed(
        user_id=test_user.id,
        asset_id=asset.id,
        type=ProceedType.DIVIDEND,
        date=date.today() - timedelta(days=10),
        value_per_share=0.50,
        quantity=150,
        total_value=75.0,
        description="Dividendos"
    )
    db.add(proceed)
    
    # Create position
    position = AssetPosition(
        user_id=test_user.id,
        asset_id=asset.id,
        quantity=150,
        average_price=15.33,
        current_price=17.0
    )
    db.add(position)
    
    db.commit()
    
    # Get asset detail
    response = client.get(f"/portfolio/assets/{asset.ticker}", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["asset"]["ticker"] == "BBDC4"
    assert data["position"]["quantity"] == 150
    assert len(data["transactions"]) == 2
    assert len(data["proceeds"]) == 1
    assert data["total_proceeds"] == 75.0


def test_cannot_access_other_users_portfolio(client: TestClient, db):
    """Test that users can't access other users' portfolios"""
    from app.models.user import User
    from app.core.security import get_password_hash, create_access_token
    
    # Create two users
    user1 = User(email="user1@test.com", hashed_password=get_password_hash("password"))
    user2 = User(email="user2@test.com", hashed_password=get_password_hash("password"))
    db.add(user1)
    db.add(user2)
    db.commit()
    db.refresh(user1)
    db.refresh(user2)
    
    # Create asset and position for user1
    asset = Asset(ticker="ABEV3", name="Ambev ON", type=AssetType.ACAO, sector="Consumo")
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    position = AssetPosition(
        user_id=user1.id,
        asset_id=asset.id,
        quantity=500,
        average_price=14.0,
        current_price=15.0
    )
    db.add(position)
    db.commit()
    
    # Login as user2
    token = create_access_token(data={"sub": str(user2.id), "email": user2.email})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to get portfolio as user2
    response = client.get("/portfolio/overview", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    # Should see empty portfolio
    assert data["positions_count"] == 0
    assert data["total_value"] == 0.0


def test_portfolio_allocation_by_type(client: TestClient, auth_headers: dict, db, test_user):
    """Test portfolio allocation by asset type"""
    # Create different types of assets
    acao = Asset(ticker="PETR4", name="Petrobras", type=AssetType.ACAO, sector="Energia")
    fii = Asset(ticker="HGLG11", name="CSHG Logística", type=AssetType.FII, sector="Logística")
    etf = Asset(ticker="IVVB11", name="iShares S&P 500", type=AssetType.ETF, sector="Internacional")
    
    db.add_all([acao, fii, etf])
    db.commit()
    db.refresh(acao)
    db.refresh(fii)
    db.refresh(etf)
    
    # Create positions with different values
    position1 = AssetPosition(
        user_id=test_user.id,
        asset_id=acao.id,
        quantity=100,
        average_price=30.0,
        current_price=30.0  # 3000 total
    )
    position2 = AssetPosition(
        user_id=test_user.id,
        asset_id=fii.id,
        quantity=50,
        average_price=100.0,
        current_price=100.0  # 5000 total
    )
    position3 = AssetPosition(
        user_id=test_user.id,
        asset_id=etf.id,
        quantity=20,
        average_price=100.0,
        current_price=100.0  # 2000 total
    )
    
    db.add_all([position1, position2, position3])
    db.commit()
    
    # Get overview
    response = client.get("/portfolio/overview", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Total: 10000
    assert data["total_value"] == 10000.0
    
    # Check allocation percentages
    allocation = data["allocation_by_type"]
    assert len(allocation) == 3
    
    # Find each type
    acao_alloc = next(a for a in allocation if a["type"] == "ACAO")
    fii_alloc = next(a for a in allocation if a["type"] == "FII")
    etf_alloc = next(a for a in allocation if a["type"] == "ETF")
    
    assert acao_alloc["percentage"] == 30.0  # 3000/10000
    assert fii_alloc["percentage"] == 50.0   # 5000/10000
    assert etf_alloc["percentage"] == 20.0   # 2000/10000


def test_portfolio_top_positions(client: TestClient, auth_headers: dict, db, test_user):
    """Test top positions are returned correctly"""
    # Create 6 assets
    assets = []
    for i in range(6):
        asset = Asset(
            ticker=f"TEST{i}",
            name=f"Test Asset {i}",
            type=AssetType.ACAO,
            sector="Test"
        )
        db.add(asset)
        assets.append(asset)
    
    db.commit()
    for asset in assets:
        db.refresh(asset)
    
    # Create positions with different values
    for i, asset in enumerate(assets):
        position = AssetPosition(
            user_id=test_user.id,
            asset_id=asset.id,
            quantity=10,
            average_price=10.0 * (i + 1),
            current_price=10.0 * (i + 1)
        )
        db.add(position)
    
    db.commit()
    
    # Get overview
    response = client.get("/portfolio/overview", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Should return only top 5
    assert len(data["top_positions"]) == 5
    
    # Top position should be TEST5 (highest value)
    assert data["top_positions"][0]["ticker"] == "TEST5"


def test_get_portfolio_requires_authentication(client: TestClient):
    """Test that portfolio endpoints require authentication"""
    # Try to access without auth
    response = client.get("/portfolio/overview")
    assert response.status_code in [401, 403]  # Can be either depending on JWT implementation
    
    response = client.get("/portfolio/assets")
    assert response.status_code in [401, 403]
    
    response = client.get("/portfolio/assets/PETR4")
    assert response.status_code in [401, 403]

