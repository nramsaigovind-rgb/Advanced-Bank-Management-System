from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import BigInteger, String, Boolean, DateTime, Numeric, ForeignKey, UniqueConstraint, CheckConstraint, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    customer_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=True, index=True)
    branch_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("branches.id", ondelete="RESTRICT"), nullable=True, index=True)
    account_type: Mapped[str] = mapped_column(
        SAEnum('SAVINGS', 'CHECKING', 'SYSTEM_CLEARING', 'LOAN_SETTLEMENT', name='account_type_enum'),
        nullable=False
    )
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum('ACTIVE', 'FROZEN', 'DORMANT', 'CLOSED', name='account_status_enum'),
        default='ACTIVE',
        nullable=False,
        index=True
    )
    is_system_account: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    version: Mapped[int] = mapped_column(BigInteger, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("balance >= 0.0000 OR is_system_account = TRUE", name="chk_acc_balance"),
    )

    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="accounts")
    branch: Mapped[Optional["Branch"]] = relationship("Branch", back_populates="accounts")
    cards: Mapped[List["Card"]] = relationship("Card", back_populates="account")
    ledger_entries: Mapped[List["LedgerEntry"]] = relationship("LedgerEntry", back_populates="account")
    outbound_transactions: Mapped[List["Transaction"]] = relationship("Transaction", foreign_keys="Transaction.source_account_id", back_populates="source_account")
    inbound_transactions: Mapped[List["Transaction"]] = relationship("Transaction", foreign_keys="Transaction.destination_account_id", back_populates="destination_account")

class Card(Base):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    card_number_masked: Mapped[str] = mapped_column(String(32), nullable=False)
    card_number_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    card_type: Mapped[str] = mapped_column(SAEnum('DEBIT', 'CREDIT', name='card_type_enum'), nullable=False)
    expiry_month: Mapped[int] = mapped_column(nullable=False)
    expiry_year: Mapped[int] = mapped_column(nullable=False)
    daily_atm_limit: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("50000.00"), nullable=False)
    daily_pos_limit: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("100000.00"), nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    block_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    account: Mapped[Account] = relationship("Account", back_populates="cards")

class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    beneficiary_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(30), nullable=False)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    daily_limit: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("200000.00"), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("customer_id", "account_number", name="uq_cust_ben_account"),
    )

    customer: Mapped["Customer"] = relationship("Customer", back_populates="beneficiaries")
