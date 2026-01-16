"""
Market Data Routes

Endpoints for fetching real market data from brapi.dev
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from app.services.brapi_service import BrapiService
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/market", tags=["Market Data"])


# Response Models
class QuoteResponse(BaseModel):
    """Stock quote response"""
    ticker: str
    name: str
    full_name: Optional[str] = None
    currency: str = "BRL"
    price: Optional[float] = None
    previous_close: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[float] = None
    market_cap: Optional[float] = None
    updated_at: Optional[str] = None
    logo_url: Optional[str] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None


class QuotesListResponse(BaseModel):
    """Multiple quotes response"""
    success: bool
    count: int
    quotes: List[QuoteResponse]


class HistoricalDataPoint(BaseModel):
    """Historical data point"""
    date: int
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[float] = None


class HistoricalResponse(BaseModel):
    """Historical data response"""
    success: bool
    ticker: str
    data: List[HistoricalDataPoint]


class StockSearchResult(BaseModel):
    """Stock search result"""
    stock: str
    name: Optional[str] = None
    close: Optional[float] = None
    change: Optional[float] = None
    volume: Optional[float] = None
    market_cap: Optional[float] = None
    logo: Optional[str] = None
    sector: Optional[str] = None
    type: Optional[str] = None

class SearchResponse(BaseModel):
    """Search response"""
    success: bool
    count: int
    results: List[StockSearchResult]


class FreeStocksResponse(BaseModel):
    """Free stocks info"""
    message: str
    free_stocks: List[str]
    note: str


# Endpoints
@router.get("/quote/{ticker}", response_model=QuoteResponse)
async def get_stock_quote(
    ticker: str,
    fundamental: bool = Query(False, description="Include fundamental data"),
    dividends: bool = Query(False, description="Include dividend history"),
    current_user: User = Depends(get_current_user)
):
    """
    Get current quote for a stock.
    """
    result = await BrapiService.get_quote(
        ticker=ticker.upper(),
        fundamental=fundamental,
        dividends=dividends
    )

    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error"))

    return QuoteResponse(**result["data"])


@router.get("/quotes", response_model=QuotesListResponse)
async def get_multiple_quotes(
    tickers: str = Query(..., description="Comma-separated list of tickers"),
    fundamental: bool = Query(False, description="Include fundamental data"),
    current_user: User = Depends(get_current_user)
):
    """
    Get quotes for multiple stocks at once.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",")]

    if len(ticker_list) > 20:
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 tickers per request"
        )

    result = await BrapiService.get_quotes(
        tickers=ticker_list,
        fundamental=fundamental
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))

    quotes = [QuoteResponse(**q) for q in result["data"]]
    return QuotesListResponse(
        success=True,
        count=len(quotes),
        quotes=quotes
    )


@router.get("/historical/{ticker}", response_model=HistoricalResponse)
async def get_historical_data(
    ticker: str,
    range: str = Query(
        "1mo",
        description="Time range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max"
    ),
    interval: str = Query(
        "1d",
        description="Data interval: 1d, 1wk, 1mo"
    )
):
    """
    Get historical price data for a stock.
    """
    valid_ranges = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"]
    valid_intervals = ["1d", "1wk", "1mo"]

    if range not in valid_ranges:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid range. Valid options: {valid_ranges}"
        )

    if interval not in valid_intervals:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid interval. Valid options: {valid_intervals}"
        )

    result = await BrapiService.get_historical(
        ticker=ticker.upper(),
        range=range,
        interval=interval
    )

    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error"))

    historical = result["data"].get("historical", [])
    data_points = [
        HistoricalDataPoint(
            date=h.get("date", 0),
            open=h.get("open"),
            high=h.get("high"),
            low=h.get("low"),
            close=h.get("close"),
            volume=h.get("volume")
        )
        for h in historical
    ]

    return HistoricalResponse(
        success=True,
        ticker=ticker.upper(),
        data=data_points
    )


@router.get("/search", response_model=SearchResponse)
async def search_stocks(
    q: str = Query(..., min_length=2, description="Search query"),
    current_user: User = Depends(get_current_user)
):
    """
    Search for stocks by name or ticker.
    """
    result = await BrapiService.search_stocks(query=q)

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))

    stocks = result["data"]
    results = [
        StockSearchResult(
            stock=s.get("stock", ""),
            name=s.get("name"),
            close=s.get("close"),
            change=s.get("change"),
            volume=s.get("volume"),
            market_cap=s.get("market_cap"),
            logo=s.get("logo"),
            sector=s.get("sector"),
            type=s.get("type")
        )
        for s in stocks
    ]

    return SearchResponse(
        success=True,
        count=len(results),
        results=results
    )


@router.get("/highlights", response_model=SearchResponse)
async def get_market_highlights(
    limit: int = Query(10, le=100)
):
    """
    Get dynamic market market highlights (top volume).
    Returns a mix of Stocks and FIIs.
    """
    result = await BrapiService.get_market_highlights(limit=limit)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))

    stocks = result["data"]
    results = [
        StockSearchResult(
            stock=s.get("stock", ""),
            name=s.get("name"),
            close=s.get("close"),
            change=s.get("change"),
            volume=s.get("volume"),
            market_cap=s.get("market_cap"),
            logo=s.get("logo"),
            sector=s.get("sector"),
            type=s.get("type")
        )
        for s in stocks
    ]
    
    return SearchResponse(
        success=True,
        count=len(results),
        results=results
    )


@router.get("/free-stocks", response_model=FreeStocksResponse)
async def get_free_stocks_info():
    """
    Get information about stocks available in the free tier.

    These stocks can be accessed without configuring a BRAPI token.
    """
    return FreeStocksResponse(
        message="The following stocks are available without a BRAPI token",
        free_stocks=BrapiService.FREE_STOCKS,
        note="For access to all 4000+ stocks, get a free token at https://brapi.dev/dashboard"
    )


@router.get("/check/{ticker}")
async def check_if_free(
    ticker: str,
    current_user: User = Depends(get_current_user)
):
    """
    Check if a stock is available in the free tier.
    """
    is_free = BrapiService.is_free_stock(ticker)
    return {
        "ticker": ticker.upper(),
        "is_free": is_free,
        "message": (
            "This stock is available without a token"
            if is_free else
            "This stock requires a BRAPI token. Get one at https://brapi.dev/dashboard"
        )
    }


# ================================
# BENCHMARKS (IBOV, CDI, SELIC)
# ================================

from app.services.benchmark_service import BenchmarkService


@router.get("/benchmarks")
async def get_benchmarks():
    """
    Get all benchmark data (IBOV, CDI, SELIC)
    
    Public endpoint - no authentication required.
    """
    return await BenchmarkService.get_all_benchmarks()


@router.get("/benchmarks/ibov")
async def get_ibov():
    """
    Get IBOV (Ibovespa) current data
    """
    return await BenchmarkService.get_ibov_data()


@router.get("/benchmarks/cdi")
async def get_cdi():
    """
    Get CDI rate data
    """
    return await BenchmarkService.get_cdi_data()


@router.get("/benchmarks/compare")
async def compare_with_benchmark(
    portfolio_start: float = Query(..., description="Portfolio initial value"),
    portfolio_current: float = Query(..., description="Portfolio current value"),
):
    """
    Compare portfolio performance against benchmarks
    """
    ibov = await BenchmarkService.get_ibov_data()
    
    comparison = BenchmarkService.calculate_ibov_comparison(
        portfolio_start,
        portfolio_current,
        ibov.get("change_1d", 0)
    )
    
    return {
        "portfolio": {
            "start_value": portfolio_start,
            "current_value": portfolio_current,
            "return_percent": comparison["portfolio_return"]
        },
        "ibov": {
            "return_percent": comparison["ibov_return"],
            "current": ibov.get("current")
        },
        "alpha": comparison["alpha"],
        "outperformed_ibov": comparison["outperformed"],
        "cdi_annual_rate": BenchmarkService.FALLBACK_DATA["CDI"]["annual_rate"]
    }
