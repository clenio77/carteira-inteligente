"""
Personal Finance models: BankAccount, TransactionCategory, PersonalTransaction
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Enum, Boolean
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class TransactionType(enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    TRANSFER = "TRANSFER"

class BankAccount(Base):
    """Bank Account model (e.g. Nubank, Itaú, Wallet)"""
    __tablename__ = "pf_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False) # e.g. "Nubank"
    type = Column(String, nullable=False) # CHECKING, SAVINGS, CREDIT_CARD, CASH
    balance = Column(Float, default=0.0)
    color = Column(String, default="#000000")
    
    user = relationship("User", back_populates="pf_accounts")
    transactions = relationship("PersonalTransaction", back_populates="account")

class TransactionCategory(Base):
    """Categories for finances (e.g. Food, Transport, Salary)"""
    __tablename__ = "pf_categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null = System default
    name = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    type = Column(Enum(TransactionType, name="pf_transaction_type"), nullable=False)
    
    transactions = relationship("PersonalTransaction", back_populates="category")

class PersonalTransaction(Base):
    """Personal income/expense transaction"""
    __tablename__ = "pf_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("pf_accounts.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("pf_categories.id"), nullable=True)
    
    type = Column(Enum(TransactionType, name="pf_transaction_type"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    date = Column(Date, nullable=False)
    is_paid = Column(Boolean, default=True)
    
    user = relationship("User", back_populates="pf_transactions")
    account = relationship("BankAccount", back_populates="transactions")
    category = relationship("TransactionCategory", back_populates="transactions")
