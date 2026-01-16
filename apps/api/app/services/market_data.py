"""
Market Data Adapter
Abstrai a busca de dados de mercado (preço, dividendos, fundamentais)
com estratégia de fallback (BrAPI -> YFinance).
"""
import logging
import httpx
# import yfinance as yf ## LAZY LOAD
# import pandas as pd
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from app.core.config import settings

logger = logging.getLogger(__name__)

class MarketDataService:
    
    @staticmethod
    async def get_quote(ticker: str) -> Dict[str, Any]:
        """
        Busca cotação e dados fundamentais.
        """
        # Tentar BrAPI primeiro (melhor qualidade para B3)
        try:
            data = await MarketDataService._get_brapi_quote(ticker)
            if data:
                return data
        except Exception as e:
            logger.warning(f"BrAPI failed for {ticker}: {e}")
            
        # Fallback para YFinance
        try:
            logger.info(f"Using YFinance fallback for {ticker}")
            return await MarketDataService._get_yfinance_quote(ticker)
        except Exception as e:
            logger.error(f"YFinance failed for {ticker}: {e}")
            return {}

    @staticmethod
    async def get_dividends_history(ticker: str, years: int = 5) -> List[Dict[str, Any]]:
        """
        Busca histórico de dividendos.
        """
        # Tentar BrAPI primeiro
        try:
            data = await MarketDataService._get_brapi_dividends(ticker, years)
            if data:
                return data
        except Exception as e:
            logger.warning(f"BrAPI dividends failed for {ticker}: {e}")
            
        # Fallback para YFinance
        try:
            return await MarketDataService._get_yfinance_dividends(ticker, years)
        except Exception as e:
            logger.error(f"YFinance dividends failed for {ticker}: {e}")
            return []

    # --- Implementações BrAPI ---
    
    @staticmethod
    async def _get_brapi_quote(ticker: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            params = {"fundamental": "true"}
            if settings.BRAPI_TOKEN:
                params["token"] = settings.BRAPI_TOKEN
            
            response = await client.get(
                f"https://brapi.dev/api/quote/{ticker.upper()}",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                if results:
                    q = results[0]
                    return {
                        "ticker": q.get("symbol"),
                        "current_price": q.get("regularMarketPrice"),
                        "price_earnings": q.get("priceEarnings"),
                        "earnings_per_share": q.get("earningsPerShare"),
                        "market_cap": q.get("marketCap"),
                        "dividend_yield": q.get("dividendYield"),
                        "name": q.get("longName") or q.get("shortName")
                    }
        return None

    @staticmethod
    async def _get_brapi_dividends(ticker: str, years: int) -> Optional[List[Dict]]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            params = {
                "dividends": "true",
                "range": f"{years}y",
                "interval": "1mo"
            }
            if settings.BRAPI_TOKEN:
                params["token"] = settings.BRAPI_TOKEN
                
            response = await client.get(
                f"https://brapi.dev/api/quote/{ticker.upper()}",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                if results and "dividendsData" in results[0]:
                    dividends = results[0]["dividendsData"].get("cashDividends", [])
                    return [
                        {
                            "date": d["paymentDate"] or d["approvedOn"],
                            "value": d["rate"],
                            "type": d["typeLabel"] or d["relatedTo"],
                            "label": d["label"]
                        }
                        for d in dividends
                    ]
        return None

    # --- Implementações YFinance ---
    
    @staticmethod
    async def _get_yfinance_quote(ticker: str) -> Dict[str, Any]:
        # Lazy Import para evitar erro se a lib falhou em instalar
        import yfinance as yf
        
        # YFinance precisa do sufixo .SA para ações brasileiras
        yf_ticker = f"{ticker.upper()}.SA" if not ticker.endswith(".SA") else ticker.upper()
        
        # Executar em thread separada pois yfinance é sincrono
        import asyncio
        loop = asyncio.get_event_loop()
        
        def fetch():
            stock = yf.Ticker(yf_ticker)
            info = stock.info
            return {
                "ticker": ticker.upper(),
                "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
                "price_earnings": info.get("trailingPE"),
                "earnings_per_share": info.get("trailingEps"),
                "market_cap": info.get("marketCap"),
                "dividend_yield": (info.get("dividendYield", 0) or 0) * 100,
                "name": info.get("longName")
            }
            
        return await loop.run_in_executor(None, fetch)

    @staticmethod
    async def _get_yfinance_dividends(ticker: str, years: int) -> List[Dict]:
        import yfinance as yf
        
        yf_ticker = f"{ticker.upper()}.SA" if not ticker.endswith(".SA") else ticker.upper()
        
        import asyncio
        loop = asyncio.get_event_loop()
        
        def fetch():
            stock = yf.Ticker(yf_ticker)
            hist = stock.dividends
            
            # Filtrar últimos X anos
            start_date = datetime.now() - timedelta(days=365*years)
            
            dividends_list = []
            for date, amount in hist.items():
                # Garantir compatibilidade de timezone
                item_date = date.to_pydatetime() if hasattr(date, 'to_pydatetime') else date
                if item_date.tzinfo:
                   item_date = item_date.replace(tzinfo=None)
                   
                if item_date >= start_date:
                    dividends_list.append({
                        "date": item_date.isoformat(),
                        "value": float(amount),
                        "type": "Dividend",
                        "label": "Dividendo"
                    })
            
            return dividends_list

        return await loop.run_in_executor(None, fetch)
