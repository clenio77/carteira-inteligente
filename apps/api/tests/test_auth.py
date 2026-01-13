"""
Tests for authentication endpoints
"""
from fastapi.testclient import TestClient


def test_register_new_user(client: TestClient):
    """Test user registration"""
    response = client.post(
        "/auth/register",
        json={"email": "test@example.com", "password": "testpassword123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "hashed_password" not in data  # Security: password should not be exposed


def test_register_duplicate_email(client: TestClient):
    """Test registration with duplicate email"""
    # Register first user
    client.post(
        "/auth/register",
        json={"email": "duplicate@example.com", "password": "password123"},
    )

    # Try to register again with same email
    response = client.post(
        "/auth/register",
        json={"email": "duplicate@example.com", "password": "password456"},
    )
    assert response.status_code == 400
    assert "já cadastrado" in response.json()["detail"].lower()


def test_login_success(client: TestClient):
    """Test successful login"""
    # Register user
    client.post(
        "/auth/register", json={"email": "login@example.com", "password": "password123"}
    )

    # Login
    response = client.post(
        "/auth/login", json={"email": "login@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient):
    """Test login with wrong password"""
    # Register user
    client.post(
        "/auth/register", json={"email": "wrong@example.com", "password": "correct123"}
    )

    # Login with wrong password
    response = client.post(
        "/auth/login", json={"email": "wrong@example.com", "password": "wrong123"}
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    """Test login with non-existent user"""
    response = client.post(
        "/auth/login",
        json={"email": "nonexistent@example.com", "password": "password123"},
    )
    assert response.status_code == 401


def test_get_current_user(client: TestClient):
    """Test getting current user info"""
    # Register and login
    client.post(
        "/auth/register", json={"email": "current@example.com", "password": "password123"}
    )
    login_response = client.post(
        "/auth/login", json={"email": "current@example.com", "password": "password123"}
    )
    token = login_response.json()["access_token"]

    # Get current user
    response = client.get(
        "/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "current@example.com"


def test_get_current_user_without_token(client: TestClient):
    """Test getting current user without token"""
    response = client.get("/auth/me")
    assert response.status_code == 403  # Forbidden without credentials


def test_get_current_user_invalid_token(client: TestClient):
    """Test getting current user with invalid token"""
    response = client.get(
        "/auth/me", headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401

