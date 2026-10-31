from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import BigInteger, String, DateTime, Date, Numeric, ForeignKey, CheckConstraint, UniqueConstraint, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    loan_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("customers.id"), nullable=False, index=True)
    branch_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("branches.id"), nullable=False, index=True)
    disbursement_account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id"), nullable=False)
    loan_type: Mapped[str] = mapped_column(
        SAEnum('PERSONAL', 'HOME', 'AUTO', 'BUSINESS', name='loan_type_enum'),
        nullable=False
    )
    principal_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    annual_interest_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    tenure_months: Mapped[int] = mapped_column(nullable=False)
    monthly_emi: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    outstanding_principal: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    outstanding_interest: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum('APPLIED', 'APPROVED', 'DISBURSED', 'CLOSED', 'REJECTED', name='loan_status_enum'),
        default='APPLIED',
        nullable=False,
        index=True
    )
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    disbursed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    approved_by_employee_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=True)

    __table_args__ = (
        CheckConstraint("principal_amount > 0.0000", name="chk_loan_principal"),
        CheckConstraint("annual_interest_rate >= 0.00 AND annual_interest_rate <= 100.00", name="chk_loan_rate"),
        CheckConstraint("tenure_months > 0", name="chk_loan_tenure"),
    )

    customer: Mapped["Customer"] = relationship("Customer", back_populates="loans")
    branch: Mapped["Branch"] = relationship("Branch", back_populates="loans")
    disbursement_account: Mapped["Account"] = relationship("Account")
    approved_by_employee: Mapped[Optional["Employee"]] = relationship("Employee", back_populates="approved_loans")
    installments: Mapped[List["LoanInstallment"]] = relationship("LoanInstallment", back_populates="loan", cascade="all, delete-orphan")
    payments: Mapped[List["LoanPayment"]] = relationship("LoanPayment", back_populates="loan")

class LoanInstallment(Base):
    __tablename__ = "loan_installments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    loan_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_number: Mapped[int] = mapped_column(nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    principal_component: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    interest_component: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum('PENDING', 'PAID', 'OVERDUE', name='installment_status_enum'),
        default='PENDING',
        nullable=False,
        index=True
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("loan_id", "installment_number", name="uq_loan_installment"),
    )

    loan: Mapped[Loan] = relationship("Loan", back_populates="installments")
    payment: Mapped[Optional["LoanPayment"]] = relationship("LoanPayment", back_populates="installment", uselist=False)

class LoanPayment(Base):
    __tablename__ = "loan_payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    loan_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("loans.id"), nullable=False, index=True)
    installment_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("loan_installments.id"), nullable=True)
    transaction_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("transactions.id"), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    principal_paid: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    interest_paid: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    payment_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("amount_paid > 0.0000", name="chk_lp_amount"),
    )

    loan: Mapped[Loan] = relationship("Loan", back_populates="payments")
    installment: Mapped[Optional[LoanInstallment]] = relationship("LoanInstallment", back_populates="payment")
    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="loan_payments")

