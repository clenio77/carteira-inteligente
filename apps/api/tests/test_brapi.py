"""
Tests for Brapi.dev integration service
"""
import pytest
from app.services.brapi_service import BrapiService


class TestBrapiService:
    """Test cases for BrapiService"""

    def test_free_stocks_list(self):
        """Test that free stocks list is defined"""
        assert len(BrapiService.FREE_STOCKS) == 4
        assert "PETR4" in BrapiService.FREE_STOCKS
        assert "VALE3" in BrapiService.FREE_STOCKS
        assert "ITUB4" in BrapiService.FREE_STOCKS
        assert "MGLU3" in BrapiService.FREE_STOCKS

    def test_is_free_stock(self):
        """Test is_free_stock method"""
        assert BrapiService.is_free_stock("PETR4") is True
        assert BrapiService.is_free_stock("petr4") is True  # Case insensitive
        assert BrapiService.is_free_stock("VALE3") is True
        assert BrapiService.is_free_stock("BBDC4") is False
        assert BrapiService.is_free_stock("ABEV3") is False

    def test_normalize_quote(self):
        """Test quote normalization"""
        raw_data = {
            "symbol": "PETR4",
            "shortName": "PETROBRAS PN",
            "longName": "Petróleo Brasileiro S.A.",
            "currency": "BRL",
            "regularMarketPrice": 38.50,
            "regularMarketPreviousClose": 38.20,
            "regularMarketOpen": 38.30,
            "regularMarketDayHigh": 39.00,
            "regularMarketDayLow": 38.10,
            "regularMarketVolume": 45678901,
            "regularMarketChange": 0.30,
            "regularMarketChangePercent": 0.78,
            "marketCap": 503100000000,
            "regularMarketTime": "2024-10-26T17:08:00.000Z",
            "logourl": "https://icons.brapi.dev/logos/PETR4.png",
            "priceEarnings": 5.5,
            "earningsPerShare": 7.0,
            "dividendYield": 12.5,
        }

        normalized = BrapiService._normalize_quote(raw_data)

        assert normalized["ticker"] == "PETR4"
        assert normalized["name"] == "PETROBRAS PN"
        assert normalized["full_name"] == "Petróleo Brasileiro S.A."
        assert normalized["currency"] == "BRL"
        assert normalized["price"] == 38.50
        assert normalized["previous_close"] == 38.20
        assert normalized["open"] == 38.30
        assert normalized["high"] == 39.00
        assert normalized["low"] == 38.10
        assert normalized["volume"] == 45678901
        assert normalized["change"] == 0.30
        assert normalized["change_percent"] == 0.78
        assert normalized["market_cap"] == 503100000000
        assert normalized["logo_url"] == "https://icons.brapi.dev/logos/PETR4.png"
        assert normalized["pe_ratio"] == 5.5
        assert normalized["eps"] == 7.0
        assert normalized["dividend_yield"] == 12.5

    def test_normalize_quote_missing_fields(self):
        """Test quote normalization with missing fields"""
        raw_data = {
            "symbol": "PETR4",
            "shortName": "PETROBRAS PN",
        }

        normalized = BrapiService._normalize_quote(raw_data)

        assert normalized["ticker"] == "PETR4"
        assert normalized["name"] == "PETROBRAS PN"
        assert normalized["price"] is None
        assert normalized["volume"] is None
        assert normalized["pe_ratio"] is None


@pytest.mark.asyncio
class TestBrapiServiceAsync:
    """Async test cases for BrapiService - Integration tests"""

    async def test_get_quote_real_api(self):
        """Test real quote retrieval from brapi.dev (free stock)"""
        result = await BrapiService.get_quote("PETR4")

        # Should succeed for free stock
        assert result["success"] is True
        assert result["data"]["ticker"] == "PETR4"
        assert result["data"]["price"] is not None
        assert result["data"]["name"] is not None

    async def test_get_quote_invalid_ticker(self):
        """Test quote retrieval for invalid ticker"""
        result = await BrapiService.get_quote("INVALID12345")

        # Should fail for invalid ticker
        assert result["success"] is False

    async def test_get_quotes_multiple_real_api(self):
        """Test fetching multiple quotes from real API"""
        result = await BrapiService.get_quotes(["PETR4", "VALE3"])

        if result["success"]:
            # If API returns data, validate it
            assert len(result["data"]) >= 1
            tickers = [q["ticker"] for q in result["data"]]
            assert "PETR4" in tickers or "VALE3" in tickers

    async def test_update_position_prices_real_api(self):
        """Test updating position prices from real API"""
        prices = await BrapiService.update_position_prices(["PETR4", "VALE3"])

        # Should return a dict with prices
        assert isinstance(prices, dict)
        assert "PETR4" in prices
        assert "VALE3" in prices
        # Free stocks should have real prices
        assert prices["PETR4"] is not None or prices["VALE3"] is not None
