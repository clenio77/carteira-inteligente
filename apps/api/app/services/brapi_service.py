"""
BRAPI.dev Integration Service

This service provides real market data from B3 (Brazilian Stock Exchange)
using the brapi.dev API.

Free tier includes:
- 15,000 requests/month
- 4 test stocks without token: PETR4, VALE3, ITUB4, MGLU3
- 3 months historical data
- 30 min data delay
"""
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.core.config import settings
from app.core.logging import logger


class BrapiService:
    """Service for fetching real market data from brapi.dev"""

    BASE_URL = "https://brapi.dev/api"

    # Stocks available for free (without token)
    FREE_STOCKS = ["PETR4", "VALE3", "ITUB4", "MGLU3"]

    @staticmethod
    async def get_quote(
        ticker: str,
        fundamental: bool = False,
        dividends: bool = False
    ) -> Dict[str, Any]:
        """
        Get current quote for a single stock.

        Args:
            ticker: Stock ticker (e.g., "PETR4")
            fundamental: Include fundamental data (P/L, P/VP, etc.)
            dividends: Include dividend history

        Returns:
            Dict with stock data or error
        """
        for attempt in range(3):
            try:
                params = {}

                # Add optional parameters
                if fundamental:
                    params["fundamental"] = "true"
                if dividends:
                    params["dividends"] = "true"

                # Add token if configured (for accessing all stocks)
                if settings.BRAPI_TOKEN:
                    params["token"] = settings.BRAPI_TOKEN

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        f"{BrapiService.BASE_URL}/quote/{ticker}",
                        params=params
                    )

                    if response.status_code == 200:
                        data = response.json()
                        if data.get("results") and len(data["results"]) > 0:
                            result = data["results"][0]
                            logger.info(f"Successfully fetched quote for {ticker}")
                            return {
                                "success": True,
                                "data": BrapiService._normalize_quote(result)
                            }
                        else:
                            return {
                                "success": False,
                                "error": f"No data found for {ticker}"
                            }
                    elif response.status_code == 404:
                        return {
                            "success": False,
                            "error": f"Stock {ticker} not found"
                        }
                    elif response.status_code >= 500:
                        logger.warning(f"API error {response.status_code} for {ticker}. Attempt {attempt+1}/3")
                        if attempt < 2:
                            await __import__("asyncio").sleep(1 * (attempt + 1))
                            continue
                        return {
                            "success": False,
                            "error": f"API error: {response.status_code}"
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"API error: {response.status_code}"
                        }

            except (httpx.TimeoutException, httpx.ConnectError) as e:
                logger.warning(f"Connection error/timeout for {ticker}: {str(e)}. Attempt {attempt+1}/3")
                if attempt < 2:
                    await __import__("asyncio").sleep(1 * (attempt + 1))
                    continue
                return {"success": False, "error": "Request timeout/Connection error"}
            except Exception as e:
                logger.error(f"Error fetching quote for {ticker}: {str(e)}")
                return {"success": False, "error": str(e)}

    # Cache storage
    _cache: Dict[str, Any] = {}
    _cache_expiry: Dict[str, float] = {}

    # Falback data explicitly hardcoded to ensure UI never breaks completely
    _fallback_data = {
        "PETR4": {"symbol": "PETR4", "shortName": "PETROBRAS PN", "regularMarketPrice": 38.50, "regularMarketChangePercent": 1.2, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 50000000},
        "VALE3": {"symbol": "VALE3", "shortName": "VALE ON", "regularMarketPrice": 68.20, "regularMarketChangePercent": -0.5, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 30000000},
        "ITUB4": {"symbol": "ITUB4", "shortName": "ITAUUNIBANCO PN", "regularMarketPrice": 33.10, "regularMarketChangePercent": 0.8, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 25000000},
        "BBDC4": {"symbol": "BBDC4", "shortName": "BRADESCO PN", "regularMarketPrice": 14.50, "regularMarketChangePercent": 0.3, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 40000000},
        "BBAS3": {"symbol": "BBAS3", "shortName": "BRASIL ON", "regularMarketPrice": 27.80, "regularMarketChangePercent": 1.5, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 15000000},
        "WEGE3": {"symbol": "WEGE3", "shortName": "WEG ON", "regularMarketPrice": 52.40, "regularMarketChangePercent": 0.1, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 10000000},
        "MGLU3": {"symbol": "MGLU3", "shortName": "MAGALU ON", "regularMarketPrice": 12.30, "regularMarketChangePercent": -2.1, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 60000000},
        "MXRF11": {"symbol": "MXRF11", "shortName": "MAXI RENDA", "regularMarketPrice": 10.50, "regularMarketChangePercent": 0.1, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 800000},
        "HGLG11": {"symbol": "HGLG11", "shortName": "CSHG LOGISTICA", "regularMarketPrice": 160.50, "regularMarketChangePercent": 0.5, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 500000},
        "KNRI11": {"symbol": "KNRI11", "shortName": "KINEA RENDA", "regularMarketPrice": 158.20, "regularMarketChangePercent": -0.2, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 400000},
        "XPML11": {"symbol": "XPML11", "shortName": "XP MALLS", "regularMarketPrice": 109.70, "regularMarketChangePercent": 0.1, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 300000},
        "BTLG11": {"symbol": "BTLG11", "shortName": "BTG LOGISTICA", "regularMarketPrice": 103.20, "regularMarketChangePercent": 0.0, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 250000},
        "VGIA11": {"symbol": "VGIA11", "shortName": "VALORA CRA", "regularMarketPrice": 9.30, "regularMarketChangePercent": 0.0, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 1000000},
        "MXRF11": {"symbol": "MXRF11", "shortName": "MAXI RENDA", "regularMarketPrice": 9.97, "regularMarketChangePercent": 0.1, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 800000},
        "CPTR11": {"symbol": "CPTR11", "shortName": "CAPITANIA AGRO", "regularMarketPrice": 9.70, "regularMarketChangePercent": 0.0, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 100000},
        "ARRI11": {"symbol": "ARRI11", "shortName": "ATRIO", "regularMarketPrice": 9.50, "regularMarketChangePercent": 0.0, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 50000},
        "CMIG3": {"symbol": "CMIG3", "shortName": "CEMIG ON", "regularMarketPrice": 11.55, "regularMarketChangePercent": 0.5, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 500000},
        "BTHF11": {"symbol": "BTHF11", "shortName": "BTG HEDGE", "regularMarketPrice": 12.50, "regularMarketChangePercent": 0.1, "logourl": "https://brapi.dev/favicon.svg", "regularMarketVolume": 100000},
    }

    @staticmethod
    async def get_quotes(
        tickers: List[str],
        fundamental: bool = False,
        dividends: bool = False
    ) -> Dict[str, Any]:
        """
        Get current quotes for multiple stocks.
        Priority: Yahoo Finance -> Brapi -> Cache/Fallback
        """
        import time
        
        # Create a cache key based on tickers
        tickers_key = ",".join(sorted(tickers))
        CACHE_KEY = f"quotes_{tickers_key}"
        CACHE_DURATION = 1800  # 30 minutes cache to save API calls
        
        now = datetime.utcnow().timestamp()
        
        # 1. Check Cache (only if valid)
        if CACHE_KEY in BrapiService._cache:
             expiry = BrapiService._cache_expiry.get(CACHE_KEY, 0)
             if now < expiry:
                 # logger.info("Returning cached batch quotes (valid)")
                 return BrapiService._cache[CACHE_KEY]
        
        # 2. Try Yahoo Finance (Free, High Limits)
        # We prefer Yahoo to avoid Brapi 429 errors
        try:
             if not fundamental and not dividends:
                 from app.services.yahoo_service import YahooService
                 yahoo_result = await YahooService.get_quotes(tickers)
                 
                 if yahoo_result["success"]:
                     final_result = yahoo_result
                     # Cache it
                     BrapiService._cache[CACHE_KEY] = final_result
                     BrapiService._cache_expiry[CACHE_KEY] = now + CACHE_DURATION
                     logger.info(f"Fetched {len(tickers)} quotes from Yahoo Finance")
                     return final_result
        except Exception as e:
             logger.warning(f"YahooService failed, falling back to Brapi: {e}")
        
        now = time.time()
        # Check Cache first
        if CACHE_KEY in BrapiService._cache and CACHE_KEY in BrapiService._cache_expiry:
             if now < BrapiService._cache_expiry[CACHE_KEY]:
                 return BrapiService._cache[CACHE_KEY]

        try:
            BATCH_SIZE = 3  # Reduced to avoid rate limiting
            all_results = []
            
            # Helper to process a single batch
            async def process_batch(batch_tickers: List[str]):
                tickers_str = ",".join(batch_tickers)
                params = {}
                if fundamental: params["fundamental"] = "true"
                if dividends: params["dividends"] = "true"
                if settings.BRAPI_TOKEN: params["token"] = settings.BRAPI_TOKEN

                # Try only ONCE. If rate limited, fail fast to fallback.
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(
                            f"{BrapiService.BASE_URL}/quote/{tickers_str}",
                            params=params
                        )

                        if response.status_code == 200:
                            data = response.json()
                            return data.get("results", [])
                        elif response.status_code == 429:
                            logger.warning(f"Rate limit (429) for {tickers_str}. Skipping batch to use fallback.")
                            return [] 
                        else:
                            logger.error(f"Batch failed: {response.status_code}")
                            return []
                except Exception as e:
                    logger.warning(f"Batch request error: {e}")
                    return []
                return []

            # Process in batches
            for i in range(0, len(tickers), BATCH_SIZE):
                batch = tickers[i:min(i + BATCH_SIZE, len(tickers))]
                if not batch: continue
                
                batch_results = await process_batch(batch)
                
                if batch_results:
                    all_results.extend(batch_results)
                
                if i + BATCH_SIZE < len(tickers):
                    await __import__("asyncio").sleep(5)  # Increased delay to avoid 429 rate limit

            if not all_results:
                # FALLBACK STRATEGY: Return Cache (expired) or Mock Data
                logger.error("All API batches failed. Trying fallback.")
                if CACHE_KEY in BrapiService._cache:
                    return BrapiService._cache[CACHE_KEY]
                
                # Construct mock response from fallback_data for requested tickers
                # Only use fallback if we have REAL data for the ticker, otherwise return failure
                mock_results = []
                missing_tickers = []
                for t in tickers:
                    # Try to find in fallback or mark as missing
                    t_upper = t.upper()
                    if t_upper in BrapiService._fallback_data:
                         mock_results.append(BrapiService._fallback_data[t_upper])
                    else:
                         # Don't use generic R$10 - mark as missing instead
                         missing_tickers.append(t)
                
                if mock_results:
                    normalized = [BrapiService._normalize_quote(r) for r in mock_results]
                    return {"success": True, "data": normalized, "note": "Partial data from Fallback"}
                else:
                    # No valid fallback data - return failure to prevent overwriting
                    return {"success": False, "error": "API unavailable and no fallback data", "missing": missing_tickers}

            normalized = [BrapiService._normalize_quote(r) for r in all_results]
            
            final_result = {"success": True, "data": normalized}
            
            # Save to cache
            BrapiService._cache[CACHE_KEY] = final_result
            BrapiService._cache_expiry[CACHE_KEY] = now + CACHE_DURATION
            
            return final_result

        except Exception as e:
            logger.error(f"Error fetching quotes: {str(e)}")
            # Last resort fallback
            if CACHE_KEY in BrapiService._cache: return BrapiService._cache[CACHE_KEY]
            return {"success": False, "error": str(e)}

    @staticmethod
    async def get_historical(
        ticker: str,
        range: str = "1mo",
        interval: str = "1d"
    ) -> Dict[str, Any]:
        """
        Get historical price data for a stock.
        """
        try:
            params = {
                "range": range,
                "interval": interval
            }
            
            if settings.BRAPI_TOKEN:
                params["token"] = settings.BRAPI_TOKEN
                
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{BrapiService.BASE_URL}/quote/{ticker}",
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("results") and len(data["results"]) > 0:
                        result = data["results"][0]
                        historical = result.get("historicalDataPrice", [])
                        return {
                            "success": True,
                            "data": {
                                "ticker": ticker,
                                "historical": historical
                            }
                        }
                    else:
                        return {"success": False, "error": f"No historical data for {ticker}"}
                elif response.status_code == 429:
                     # Fallback for historical (empty but success to avoid crash)
                     return {"success": True, "data": {"ticker": ticker, "historical": []}}
                else:
                    return {"success": False, "error": f"API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"Error fetching historical data: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def search_stocks(query: str) -> Dict[str, Any]:
        """
        Search for stocks by name or ticker.
        
        Args:
            query: Search query
            
        Returns:
            Dict with search results or error
        """
        try:
            params = {"search": query}
            
            if settings.BRAPI_TOKEN:
                params["token"] = settings.BRAPI_TOKEN
                
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{BrapiService.BASE_URL}/quote/list",
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    stocks = data.get("stocks", [])
                    return {
                        "success": True,
                        "data": stocks
                    }
                else:
                    return {
                        "success": False,
                        "error": f"API error: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Error searching stocks: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    async def get_available_stocks() -> Dict[str, Any]:
        """
        Get list of all available stocks.
        
        Returns:
            Dict with list of stocks or error
        """
        try:
            params = {}
            if settings.BRAPI_TOKEN:
                params["token"] = settings.BRAPI_TOKEN

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{BrapiService.BASE_URL}/quote/list",
                    params=params
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "data": data.get("stocks", [])
                    }
                else:
                    return {
                        "success": False,
                        "error": f"API error: {response.status_code}"
                    }

        except Exception as e:
            logger.error(f"Error fetching stock list: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def _determine_asset_type(ticker: str) -> str:
        """Determine if asset is stock or fund based on ticker"""
        ticker = ticker.upper()
        if ticker.endswith("11"):
             if ticker.startswith("BPAC") or ticker in ["TIET11", "KLBN11", "SANB11", "ALUP11", "TAEE11", "SAPR11"]:
                 return "stock"
             return "fund"
        return "stock"

    @staticmethod
    async def get_market_highlights(limit: int = 10) -> Dict[str, Any]:
        """
        Get market highlights based on a curated list of major assets.
        Uses a SINGLE API call for a fixed list of ~12 top assets to ensure quality and avoid rate limits.
        """
        import time
        
        CACHE_KEY = "market_highlights"
        CACHE_DURATION = 10800  # 3 hours for highlights
        
        # Check Cache
        now = time.time()
        if CACHE_KEY in BrapiService._cache and CACHE_KEY in BrapiService._cache_expiry:
            if now < BrapiService._cache_expiry[CACHE_KEY]:
                logger.info("Returning cached market highlights")
                return BrapiService._cache[CACHE_KEY]

        # REVERTED TO CURATED LIST: The generic /list endpoint returns weird assets (e.g. AZUL54).
        # We manually select the top liquid assets in Brazil to ensure users see relevant info.
        # Kept list small (<30) to ensure we can fetch in ONE request.
        MAJOR_ASSETS = [
            # Ibovespa Giants & High Volume
            "PETR4", "VALE3", "ITUB4", "BBDC4", "BBAS3", "WEGE3", 
            "ABEV3", "BPAC11", "ELET3", "RENT3", "SUZB3", "JBSS3", 
            "PRIO3", "MGLU3", "LREN3", "RAIL3", "CMIG4", "GGBR4",
            "HAPV3", "RDOR3", "CSAN3", "PETR3", "B3SA3", "VIBRA3",
            # Top FIIs (Funds)
            "HGLG11", "MXRF11", "XPLG11", "KNRI11", "XPML11", "VISC11", 
            "BTLG11", "IRDM11", "KNCR11", "CPTS11"
        ]

        try:
            # Use get_quotes to handle batching and caching automatically
            # This avoids the URL length/ticker limit issue with the API
            result = await BrapiService.get_quotes(MAJOR_ASSETS)
            
            if result["success"]:
                quotes = result["data"]
                
                # Normalize to SearchResult format
                normalized_data = []
                for q in quotes:
                    ticker = q.get("ticker")
                    asset_type = BrapiService._determine_asset_type(ticker)

                    normalized_data.append({
                        "stock": ticker,
                        "name": q.get("name"),
                        "close": q.get("price"),
                        "change": q.get("change_percent"),
                        "volume": q.get("volume"),
                        "market_cap": q.get("market_cap"),
                        "logo": q.get("logo_url"),
                        "type": asset_type
                    })
                
                # Sort by Change % DESC (Top Gainers)
                normalized_data.sort(
                    key=lambda x: x.get("change") or -999, 
                    reverse=True
                )
                
                final_result = {
                    "success": True,
                    "data": normalized_data[:limit]
                }
                
                # update cache
                BrapiService._cache[CACHE_KEY] = final_result
                BrapiService._cache_expiry[CACHE_KEY] = now + CACHE_DURATION
                
                return final_result
            else:
                # If get_quotes failed completely (unlikely due to its own fallback)
                logger.warning(f"get_quotes failed for highlights: {result.get('error')}")
                raise Exception(result.get("error"))

        except Exception as e:
             logger.error(f"Error getting market highlights: {str(e)}")
             if CACHE_KEY in BrapiService._cache:
                 return BrapiService._cache[CACHE_KEY]
             
             # Fallback on exception
             fallback_list = list(BrapiService._fallback_data.values())
             normalized_fallback = []
             for item in fallback_list:
                  normalized_fallback.append({
                        "stock": item["symbol"],
                        "name": item["shortName"],
                        "close": item["regularMarketPrice"],
                        "change": item["regularMarketChangePercent"],
                        "volume": item["regularMarketVolume"],
                        "market_cap": 0,
                        "logo": item["logourl"],
                        "type": BrapiService._determine_asset_type(item["symbol"])
                    })
             return {"success": True, "data": normalized_fallback}

        except Exception as e:
             logger.error(f"Error getting market highlights: {str(e)}")
             if CACHE_KEY in BrapiService._cache:
                 return BrapiService._cache[CACHE_KEY]
             
             # Fallback on exception too
             fallback_list = list(BrapiService._fallback_data.values())
             normalized_fallback = []
             for item in fallback_list:
                  normalized_fallback.append({
                        "stock": item["symbol"],
                        "name": item["shortName"],
                        "close": item["regularMarketPrice"],
                        "change": item["regularMarketChangePercent"],
                        "volume": item["regularMarketVolume"],
                        "market_cap": 0,
                        "logo": item["logourl"],
                        "type": BrapiService._determine_asset_type(item["symbol"])
                    })
             return {"success": True, "data": normalized_fallback}

    @staticmethod
    def _normalize_quote(raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize quote data to a standard format.
        
        Args:
            raw: Raw quote data from API
            
        Returns:
            Normalized quote data
        """
        return {
            "ticker": raw.get("symbol", ""),
            "name": raw.get("shortName", ""),
            "full_name": raw.get("longName", ""),
            "currency": raw.get("currency", "BRL"),
            "price": raw.get("regularMarketPrice"),
            "previous_close": raw.get("regularMarketPreviousClose"),
            "open": raw.get("regularMarketOpen"),
            "high": raw.get("regularMarketDayHigh"),
            "low": raw.get("regularMarketDayLow"),
            "volume": raw.get("regularMarketVolume"),
            "change": raw.get("regularMarketChange"),
            "change_percent": raw.get("regularMarketChangePercent"),
            "market_cap": raw.get("marketCap"),
            "updated_at": raw.get("regularMarketTime"),
            "logo_url": raw.get("logourl"),
            # Fundamental data (if requested)
            "pe_ratio": raw.get("priceEarnings"),
            "eps": raw.get("earningsPerShare"),
            "dividend_yield": raw.get("dividendYield"),
            # Dividends history (if requested)
            "dividends": raw.get("dividendsData", {}).get("cashDividends", []),
        }

    @staticmethod
    async def update_position_prices(
        tickers: List[str]
    ) -> Dict[str, Optional[float]]:
        """
        Get current prices for a list of tickers.
        Useful for updating portfolio positions.
        
        Args:
            tickers: List of tickers to fetch prices for
            
        Returns:
            Dict mapping ticker to current price (or None if failed)
        """
        result = await BrapiService.get_quotes(tickers)

        if not result["success"]:
            logger.error(f"Failed to fetch prices: {result.get('error')}")
            return {ticker: None for ticker in tickers}

        prices = {}
        for quote in result["data"]:
            prices[quote["ticker"]] = quote.get("price")

        # Fill missing tickers with None
        for ticker in tickers:
            if ticker not in prices:
                prices[ticker] = None

        return prices

    @staticmethod
    def is_free_stock(ticker: str) -> bool:
        """
        Check if a stock is available in the free tier.
        
        Args:
            ticker: Stock ticker
            
        Returns:
            True if stock is in free tier
        """
        return ticker.upper() in BrapiService.FREE_STOCKS

