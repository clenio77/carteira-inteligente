"""
Benchmark Service - Fetches IBOV and CDI data for comparison
"""
import httpx
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class BenchmarkService:
    """Service to fetch benchmark data (IBOV, CDI, etc.)"""
    
    # Cache for benchmark data
    _cache: Dict[str, Any] = {}
    _cache_expiry: Dict[str, float] = {}
    CACHE_DURATION = 3600  # 1 hour
    
    # Known benchmark values (fallback)
    FALLBACK_DATA = {
        "IBOV": {
            "current": 120000,
            "change_1d": 0.5,
            "change_1m": 2.5,
            "change_ytd": 5.0,
            "change_1y": 10.0,
        },
        "CDI": {
            "annual_rate": 13.65,  # Taxa anual
            "monthly_rate": 1.07,  # ~13.65% / 12
            "daily_rate": 0.051,   # ~13.65% / 252
        },
        "SELIC": {
            "annual_rate": 13.75,
        },
        "IPCA": {
            "annual_rate": 4.5,
            "monthly_rate": 0.37,
        }
    }
    
    @staticmethod
    async def get_ibov_data() -> Dict[str, Any]:
        """
        Get IBOV (Ibovespa) current data and performance
        """
        cache_key = "ibov_data"
        now = datetime.utcnow().timestamp()
        
        # Check cache
        if cache_key in BenchmarkService._cache:
            if now < BenchmarkService._cache_expiry.get(cache_key, 0):
                return BenchmarkService._cache[cache_key]
        
        try:
            from app.core.config import settings
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try to get IBOV from Brapi
                params = {}
                if settings.BRAPI_TOKEN:
                    params["token"] = settings.BRAPI_TOKEN
                
                response = await client.get(
                    "https://brapi.dev/api/quote/%5EBVSP",  # ^BVSP = IBOV
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = data.get("results", [])
                    
                    if results:
                        quote = results[0]
                        result = {
                            "symbol": "IBOV",
                            "name": "Ibovespa",
                            "current": quote.get("regularMarketPrice", 0),
                            "change_1d": quote.get("regularMarketChangePercent", 0),
                            "previous_close": quote.get("regularMarketPreviousClose", 0),
                            "updated_at": datetime.utcnow().isoformat(),
                        }
                        
                        # Cache it
                        BenchmarkService._cache[cache_key] = result
                        BenchmarkService._cache_expiry[cache_key] = now + BenchmarkService.CACHE_DURATION
                        
                        return result
        except Exception as e:
            logger.warning(f"Failed to fetch IBOV data: {e}")
        
        # Return fallback
        return {
            "symbol": "IBOV",
            "name": "Ibovespa",
            **BenchmarkService.FALLBACK_DATA["IBOV"],
            "source": "fallback"
        }
    
    @staticmethod
    async def get_cdi_data() -> Dict[str, Any]:
        """
        Get CDI (Certificado de Depósito Interbancário) rates
        """
        # CDI is updated once a day by BACEN, so we use known values
        # In production, this could fetch from BACEN API
        
        return {
            "symbol": "CDI",
            "name": "CDI",
            **BenchmarkService.FALLBACK_DATA["CDI"],
            "description": "Taxa CDI anualizada",
            "source": "bcb"
        }
    
    @staticmethod
    async def get_selic_data() -> Dict[str, Any]:
        """
        Get SELIC rate
        """
        return {
            "symbol": "SELIC",
            "name": "Taxa Selic",
            **BenchmarkService.FALLBACK_DATA["SELIC"],
            "source": "bcb"
        }
    
    @staticmethod
    async def get_all_benchmarks() -> Dict[str, Any]:
        """
        Get all benchmark data
        """
        ibov = await BenchmarkService.get_ibov_data()
        cdi = await BenchmarkService.get_cdi_data()
        selic = await BenchmarkService.get_selic_data()
        
        return {
            "ibov": ibov,
            "cdi": cdi,
            "selic": selic,
            "updated_at": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def calculate_cdi_return(days: int, initial_value: float = 100) -> float:
        """
        Calculate CDI return over a period
        
        Args:
            days: Number of days
            initial_value: Initial investment value
            
        Returns:
            Final value after CDI returns
        """
        daily_rate = BenchmarkService.FALLBACK_DATA["CDI"]["daily_rate"] / 100
        return initial_value * ((1 + daily_rate) ** days)
    
    @staticmethod
    def calculate_ibov_comparison(
        portfolio_start_value: float,
        portfolio_current_value: float,
        ibov_change_percent: float
    ) -> Dict[str, Any]:
        """
        Compare portfolio performance against IBOV
        """
        portfolio_return = ((portfolio_current_value - portfolio_start_value) / portfolio_start_value) * 100 if portfolio_start_value else 0
        
        alpha = portfolio_return - ibov_change_percent
        
        return {
            "portfolio_return": round(portfolio_return, 2),
            "ibov_return": round(ibov_change_percent, 2),
            "alpha": round(alpha, 2),
            "outperformed": alpha > 0
        }
