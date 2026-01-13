from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from enum import Enum

class TransactionType(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"

class AccountType(str, Enum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS"
    CREDIT_CARD = "CREDIT_CARD"
    WALLET = "WALLET"
    INVESTMENT = "INVESTMENT"

# --- Account Schemas ---
class BankAccountBase(BaseModel):
    name: str
    type: str  # using str to be flexible or AccountType
    balance: float = 0.0
    color: Optional[str] = "#000000"

class BankAccountCreate(BankAccountBase):
    pass

class BankAccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None
    color: Optional[str] = None

class BankAccount(BankAccountBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    type: TransactionType

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    user_id: Optional[int] = None # System default if None

    class Config:
        from_attributes = True

# --- Transaction Schemas ---
class TransactionBase(BaseModel):
    account_id: int
    category_id: Optional[int] = None
    type: TransactionType
    amount: float
    description: Optional[str] = None
    date: date
    is_paid: bool = True

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    type: Optional[TransactionType] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[date] = None
    is_paid: Optional[bool] = None

class PersonalTransaction(TransactionBase):
    id: int
    user_id: int
    category_name: Optional[str] = None # Enriched field
    account_name: Optional[str] = None # Enriched field

    class Config:
        from_attributes = True
