from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import BigInteger, String, DateTime, Numeric, ForeignKey, CheckConstraint, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    reference_no: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)
    source_account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id"), nullable=False, index=True)
    destination_account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    transaction_type: Mapped[str] = mapped_column(
        SAEnum('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'INTEREST_CREDIT', name='tx_type_enum'),
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        SAEnum('PENDING', 'COMPLETED', 'FAILED', 'ROLLED_BACK', name='tx_status_enum'),
        default='PENDING',
        nullable=False,
        index=True
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint("amount > 0.0000", name="chk_tx_amount"),
    )

    source_account: Mapped["Account"] = relationship("Account", foreign_keys=[source_account_id], back_populates="outbound_transactions")
    destination_account: Mapped["Account"] = relationship("Account", foreign_keys=[destination_account_id], back_populates="inbound_transactions")
    ledger_entries: Mapped[List["LedgerEntry"]] = relationship("LedgerEntry", back_populates="transaction", cascade="all, delete-orphan")
    loan_payments: Mapped[List["LoanPayment"]] = relationship("LoanPayment", back_populates="transaction")

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    transaction_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id"), nullable=False, index=True)
    entry_type: Mapped[str] = mapped_column(SAEnum('DEBIT', 'CREDIT', name='entry_type_enum'), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    posted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        CheckConstraint("amount > 0.0000", name="chk_le_amount"),
    )

    transaction: Mapped[Transaction] = relationship("Transaction", back_populates="ledger_entries")
    account: Mapped["Account"] = relationship("Account", back_populates="ledger_entries")

class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    aggregate_type: Mapped[str] = mapped_column(String(60), nullable=False)
    aggregate_id: Mapped[str] = mapped_column(String(60), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum('PENDING', 'PROCESSED', 'FAILED', name='outbox_status_enum'),
        default='PENDING',
        nullable=False,
        index=True
    )
    retry_count: Mapped[int] = mapped_column(default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

