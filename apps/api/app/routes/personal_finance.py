from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from sqlalchemy import func

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.models.personal_finance import BankAccount, TransactionCategory, PersonalTransaction, TransactionType as DBTransactionType
from app.schemas.personal_finance import (
    BankAccount as AccountSchema, BankAccountCreate, 
    Category as CategorySchema, CategoryCreate, 
    PersonalTransaction as TransactionSchema, TransactionCreate, TransactionType
)

router = APIRouter(prefix="/personal-finance", tags=["Personal Finance"])

# =======================
# ACCOUNTS
# =======================
@router.get("/accounts", response_model=List[AccountSchema])
async def list_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all user bank accounts"""
    accounts = db.query(BankAccount).filter(BankAccount.user_id == current_user.id).all()
    return accounts

@router.post("/accounts", response_model=AccountSchema)
async def create_account(
    account: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new bank account"""
    db_account = BankAccount(
        user_id=current_user.id,
        name=account.name,
        type=account.type,
        balance=account.balance,
        color=account.color
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account

# =======================
# CATEGORIES
# =======================
@router.get("/categories", response_model=List[CategorySchema])
async def list_categories(
    type: Optional[TransactionType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List categories (system defaults + user defined)"""
    query = db.query(TransactionCategory).filter(
        (TransactionCategory.user_id == current_user.id) | (TransactionCategory.user_id == None)
    )
    if type:
        query = query.filter(TransactionCategory.type == type.value)
    
    return query.all()

@router.post("/categories", response_model=CategorySchema)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a custom category"""
    db_category = TransactionCategory(
        user_id=current_user.id,
        name=category.name,
        icon=category.icon,
        type=category.type.value # Enum string
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a user-defined category"""
    category = db.query(TransactionCategory).filter(
        TransactionCategory.id == category_id,
        TransactionCategory.user_id == current_user.id
    ).first()
    
    if not category:
        # Check if it is a system category
        sys_cat = db.query(TransactionCategory).filter(TransactionCategory.id == category_id, TransactionCategory.user_id == None).first()
        if sys_cat:
            raise HTTPException(status_code=403, detail="Cannot delete system category")
        raise HTTPException(status_code=404, detail="Category not found")
        
    # Check if used in transactions
    usage = db.query(PersonalTransaction).filter(PersonalTransaction.category_id == category_id).first()
    if usage:
        raise HTTPException(status_code=400, detail="Category is in use. Delete transactions first.")
        
    db.delete(category)
    db.commit()
    return {"message": "Category deleted"}


# =======================
# TRANSACTIONS
# =======================
@router.get("/transactions", response_model=List[TransactionSchema])
async def list_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    account_id: Optional[int] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List transactions with filters"""
    query = db.query(PersonalTransaction).filter(PersonalTransaction.user_id == current_user.id)
    
    if start_date:
        query = query.filter(PersonalTransaction.date >= start_date)
    if end_date:
        query = query.filter(PersonalTransaction.date <= end_date)
    if account_id:
        query = query.filter(PersonalTransaction.account_id == account_id)
        
    transactions = query.order_by(PersonalTransaction.date.desc()).limit(limit).all()
    
    # Enrich with names (optimization: could happen in DB join)
    results = []
    for tx in transactions:
        tx_schema = TransactionSchema.model_validate(tx)
        if tx.category:
            tx_schema.category_name = tx.category.name
        if tx.account:
            tx_schema.account_name = tx.account.name
        results.append(tx_schema)
        
    return results

@router.post("/transactions", response_model=TransactionSchema)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new income/expense transaction"""
    # Verify account ownership
    account = db.query(BankAccount).filter(
        BankAccount.id == transaction.account_id,
        BankAccount.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    db_tx = PersonalTransaction(
        user_id=current_user.id,
        account_id=transaction.account_id,
        category_id=transaction.category_id,
        type=transaction.type.value,
        amount=transaction.amount,
        description=transaction.description,
        date=transaction.date,
        is_paid=transaction.is_paid
    )
    
    # Update account balance logic
    # TODO: More complex logic might handle 'is_paid' later
    if transaction.is_paid:
        if transaction.type == TransactionType.INCOME:
            account.balance += transaction.amount
        elif transaction.type == TransactionType.EXPENSE:
            account.balance -= transaction.amount
            
    db.add(db_tx)
    # db.add(account) # Implicitly added via relationship/session
    db.commit()
    db.refresh(db_tx)
    
    tx_schema = TransactionSchema.model_validate(db_tx)
    if db_tx.category:
        tx_schema.category_name = db_tx.category.name
    if db_tx.account:
        tx_schema.account_name = db_tx.account.name
        
    return tx_schema

@router.delete("/transactions/{tx_id}")
async def delete_transaction(
    tx_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction and revert balance"""
    tx = db.query(PersonalTransaction).filter(
        PersonalTransaction.id == tx_id,
        PersonalTransaction.user_id == current_user.id
    ).first()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Revert balance
    if tx.is_paid:
        account = db.query(BankAccount).filter(BankAccount.id == tx.account_id).first()
        if account:
            if tx.type == "INCOME": # Was income, subtract
                account.balance -= tx.amount
            elif tx.type == "EXPENSE": # Was expense, add back
                account.balance += tx.amount
                
    db.delete(tx)
    db.commit()
    return {"message": "Transaction deleted"}

@router.post("/dashboard/summary")
async def get_finance_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get total balance, income and expense for current month"""
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    
    # Total Balance
    total_balance = db.query(func.sum(BankAccount.balance)).filter(
        BankAccount.user_id == current_user.id
    ).scalar() or 0.0
    
    # Income Month
    income_month = db.query(func.sum(PersonalTransaction.amount)).filter(
        PersonalTransaction.user_id == current_user.id,
        PersonalTransaction.date >= start_of_month,
        PersonalTransaction.type == "INCOME"
    ).scalar() or 0.0
    
    # Expense Month
    expense_month = db.query(func.sum(PersonalTransaction.amount)).filter(
        PersonalTransaction.user_id == current_user.id,
        PersonalTransaction.date >= start_of_month,
        PersonalTransaction.type == "EXPENSE"
    ).scalar() or 0.0
    
    return {
        "total_balance": total_balance,
        "current_month": {
            "income": income_month,
            "expense": expense_month,
            "balance": income_month - expense_month
        }
    }

@router.get("/analytics/categories")
async def get_expenses_by_category(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expenses grouped by category for a specific month/year"""
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year
    
    # Calculate start and end of month
    import calendar
    _, last_day = calendar.monthrange(target_year, target_month)
    start_date = date(target_year, target_month, 1)
    end_date = date(target_year, target_month, last_day)
    
    # Query: Sum amount by category, filter by date, type=EXPENSE, user
    results = db.query(
        TransactionCategory.name,
        func.sum(PersonalTransaction.amount).label("total")
    ).join(
        PersonalTransaction, PersonalTransaction.category_id == TransactionCategory.id
    ).filter(
        PersonalTransaction.user_id == current_user.id,
        PersonalTransaction.type == "EXPENSE",
        PersonalTransaction.date >= start_date,
        PersonalTransaction.date <= end_date
    ).group_by(TransactionCategory.name).all()
    
    # Format response
    data = [{"name": r[0], "value": r[1]} for r in results]
    
    # Handle transactions without category (optional, if you allow null categories)
    uncategorized = db.query(func.sum(PersonalTransaction.amount)).filter(
        PersonalTransaction.user_id == current_user.id,
        PersonalTransaction.type == "EXPENSE",
        PersonalTransaction.category_id == None,
        PersonalTransaction.date >= start_date,
        PersonalTransaction.date <= end_date
    ).scalar()
    
    if uncategorized and uncategorized > 0:
        data.append({"name": "Sem Categoria", "value": uncategorized})
        
    return data
