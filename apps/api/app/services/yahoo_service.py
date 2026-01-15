import httpx
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class YahooService:
    """
    Service to fetch market data from Yahoo Finance (Unofficial API).
    Used as an alternative to Brapi to avoid rate limits.
    """
    BASE_URL = "https://query1.finance.yahoo.com/v7/finance/quote"
    
    @staticmethod
    async def get_quotes(tickers: List[str]) -> Dict[str, Any]:
        """
        Fetch quotes from Yahoo Finance.
        Automatically appends .SA for B3 stocks if needed.
        """
        if not tickers:
            return {"success": True, "data": []}
            
        # Add .SA suffix for B3 tickers
        target_tickers = []
        ticker_map = {} # Maps YAHOO_TICKER -> ORIGINAL_TICKER
        
        for t in tickers:
            original = t.upper().strip()
            # Heuristic: If it looks like a brazilian ticker and no suffix
            if not ".SA" in original:
                 yahoo_ticker = f"{original}.SA"
            else:
                 yahoo_ticker = original
            
            target_tickers.append(yahoo_ticker)
            ticker_map[yahoo_ticker] = original

        try:
            # Join tickers with comma
            tickers_str = ",".join(target_tickers)
            
            # User-Agent is often required to avoid 403
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{YahooService.BASE_URL}",
                    params={"symbols": tickers_str},
                    headers=headers
                )
                
                if response.status_code != 200:
                    logger.error(f"Yahoo API Error: {response.status_code} - {response.text}")
                    return {"success": False, "error": f"Yahoo API {response.status_code}"}
                
                data = response.json()
                results = data.get("quoteResponse", {}).get("result", [])
                
                normalized_data = []
                for q in results:
                    yahoo_symbol = q.get("symbol")
                    # Map back to original ticker (remove .SA)
                    original = ticker_map.get(yahoo_symbol, yahoo_symbol.replace(".SA", ""))
                    
                    # Normalize fields to match BrapiService output
                    normalized_data.append({
                        "ticker": original,
                        "price": q.get("regularMarketPrice", 0.0),
                        "change_percent": q.get("regularMarketChangePercent", 0.0),
                        "volume": q.get("regularMarketVolume", 0),
                        "market_cap": q.get("marketCap", 0),
                        "high": q.get("regularMarketDayHigh", 0.0),
                        "low": q.get("regularMarketDayLow", 0.0),
                        "open": q.get("regularMarketOpen", 0.0),
                        # Yahoo doesn't provide easy logo URLs. Use generic or empty.
                        "logo_url": f"https://ui-avatars.com/api/?name={original}&background=0D8ABC&color=fff&size=128",
                        "short_name": q.get("shortName") or q.get("longName"),
                    })
                
                return {"success": True, "data": normalized_data}

        except Exception as e:
            logger.error(f"Yahoo Service Error: {str(e)}")
            return {"success": False, "error": str(e)}
