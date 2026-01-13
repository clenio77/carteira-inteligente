from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, date
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction, TransactionType
from app.models.asset import Asset
from app.services.brapi_service import BrapiService


router = APIRouter(tags=["Analytics"])

@router.get("/history")
async def get_portfolio_history(
    period_range: str = "1mo", # 1d, 1mo, 6mo, 1y, ytd, all
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get portfolio value history based on transaction history and historical prices.
    
    This performs a day-by-day replay of transactions to calculate the exact portfolio value
    at each point in time.
    """
    
    # 1. Determine start date
    today = datetime.now().date()
    start_date = today
    interval = "1d"
    
    if period_range == "1d":
        start_date = today - timedelta(days=1)
    elif period_range == "1mo":
        start_date = today - timedelta(days=30)
    elif period_range == "3mo":
        start_date = today - timedelta(days=90)
    elif period_range == "6mo":
        start_date = today - timedelta(days=180)
    elif period_range == "1y":
        start_date = today - timedelta(days=365)
    elif period_range == "ytd":
        start_date = date(today.year, 1, 1)
    else:
        start_date = today - timedelta(days=30) # Default
        
    # 2. Get all user transactions
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.date.asc()).all()
    
    if not transactions:
        return {"dates": [], "values": []}
    
    # Adjust start_date if first transaction is later (but logic handles it by 0 quantity)
    # However, if we want full history, we might adjust.
    # For now, stick to requested range.
    
    # 3. Identify assets involved in the period or currently held
    # Getting unique assets from ANY transaction is safer
    asset_ids = set([t.asset_id for t in transactions])
    assets = db.query(Asset).filter(Asset.id.in_(asset_ids)).all()
    ticker_map = {a.id: a.ticker for a in assets}
    tickers = [a.ticker for a in assets]
    
    # 4. Fetch historical prices for ALL involved assets
    # This might be slow if many assets. In production, caching is essential.
    # For MVP, we fetch sequentially or use a bulk endpoint if brapi has it (get_quotes is current only)
    # Brapi get_historical takes one ticker usually.
    
    price_history = {} # {ticker: {date_str: price}}
    
    import asyncio
    
    async def fetch_history(ticker):
        # Map range to brapi range
        brapi_range = period_range if period_range in ["1mo", "3mo", "6mo", "1y", "ytd"] else "1mo"
        if period_range == "1d": brapi_range = "5d" # Shortest history
        
        hist = await BrapiService.get_historical(ticker, range=brapi_range)
        if hist["success"]:
            # Process history into a dict day -> close price
            prices = {}
            for day in hist["data"]["historical"]:
                # Brapi date format usually unix timestamp or "2024-01-01"
                # Check brapi output format. Service returns raw 'historicalDataPrice' list
                # Assuming entries have 'date' and 'close'
                d_val = day.get("date") # 16789... or string
                price = day.get("close")
                
                if d_val and price:
                    # Parse date
                    try:
                        if isinstance(d_val, int):
                            d_obj = datetime.fromtimestamp(d_val).date()
                        else:
                             # Could be string, try parsing - simplistic 
                             d_obj = datetime.fromtimestamp(int(d_val)).date() 
                    except:
                       continue
                    
                    prices[d_obj] = price
            price_history[ticker] = prices

    # Run fetches concurrently-ish
    # Note: Requests are async in service
    tasks = [fetch_history(t) for t in tickers]
    await asyncio.gather(*tasks)
    
    # 5. Replay Transactions
    # We iterate day by day from start_date to today
    
    current_quantities = {t: 0 for t in tickers}
    portfolio_history = []
    
    # Pre-calculate quantities BEFORE start_date
    # Fix: Ensure we compare date objects (t.date is datetime)
    pre_transactions = [t for t in transactions if t.date.date() < start_date]
    for tx in pre_transactions:
        tick = ticker_map.get(tx.asset_id)
        if not tick: continue
        if tx.type == TransactionType.BUY:
            current_quantities[tick] += tx.quantity
        else:
            current_quantities[tick] -= tx.quantity
            
    # Iterate days
    delta = timedelta(days=1)
    d = start_date
    
    while d <= today:
        # Apply transactions of day d
        day_cw_transactions = [t for t in transactions if t.date.date() == d]
        for tx in day_cw_transactions:
            tick = ticker_map.get(tx.asset_id)
            if not tick: continue
            if tx.type == TransactionType.BUY:
                current_quantities[tick] += tx.quantity
            else:
                current_quantities[tick] -= tx.quantity
        
        # Calculate Value
        day_total = 0.0
        
        for tick, qty in current_quantities.items():
            if qty > 0:
                # Find price for day d
                # If no price (weekend/holiday), use last known price
                ph = price_history.get(tick, {})
                price = ph.get(d)
                
                # Fallback logic: look back X days
                if price is None:
                    lookback = d
                    for _ in range(5): # Look back 5 days max
                        lookback -= delta
                        price = ph.get(lookback)
                        if price: break
                
                if price:
                    day_total += qty * price
                # If still no price (e.g. recent IPO or fetch failed), maybe use cost basis? 
                # Ignoring for now or could use current fallback if desperate.
        
        if day_total > 0: # Only add if we have value (filters out holidays if fallback fails)
             portfolio_history.append({
                 "date": d.isoformat(),
                 "value": round(day_total, 2)
             })
        
        d += delta
        
    return portfolio_history

@router.get("/dividends")
async def get_dividends_history(
     range: str = "12mo", 
     current_user: User = Depends(get_current_user),
     db: Session = Depends(get_db)):
    
    # 1. Determine start date
    today = date.today()
    start_date = today - timedelta(days=365) # Default 12mo
    
    if range == "ytd":
        start_date = date(today.year, 1, 1)
    elif range == "all":
        start_date = date(2000, 1, 1) # Far past
    elif range == "12mo":
        start_date = today - timedelta(days=365)
        
    # 2. Query Proceeds
    from app.models.proceed import Proceed
    proceeds = db.query(Proceed).filter(
        Proceed.user_id == current_user.id,
        Proceed.date >= start_date
    ).order_by(Proceed.date.asc()).all()
    
    # 3. Aggregate by Month
    monthly_data = {} # "YYYY-MM" -> value
    
    # Initialize months if range is 12mo or YTD to ensure 0s
    if range in ["12mo", "ytd"]:
        current = start_date.replace(day=1)
        end = today.replace(day=1)
        while current <= end:
            key = current.strftime("%Y-%m")
            monthly_data[key] = 0.0
            # Next month
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)

    for p in proceeds:
        month_key = p.date.strftime("%Y-%m")
        if month_key not in monthly_data:
             monthly_data[month_key] = 0.0
        monthly_data[month_key] += p.total_value

    # 4. Format Result
    # Sorted list of dicts
    result = [
        {"date": k, "value": round(v, 2)}
        for k, v in sorted(monthly_data.items())
    ]
    
    return result
