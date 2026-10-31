from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import BigInteger, String, DateTime, Date, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    branch_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("branches.id"), nullable=False)
    customer_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(60), nullable=False)
    last_name: Mapped[str] = mapped_column(String(60), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(10), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(60), nullable=False)
    state: Mapped[str] = mapped_column(String(60), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    pan_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    kyc_status: Mapped[str] = mapped_column(SAEnum('PENDING', 'VERIFIED', 'REJECTED', name='kyc_status_enum'), default='PENDING', nullable=False)
    kyc_document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    kyc_document_id: Mapped[str] = mapped_column(String(50), nullable=False)
    verified_by_employee_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="customer_profile")
    branch: Mapped["Branch"] = relationship("Branch", back_populates="customers")
    verified_by_employee: Mapped[Optional["Employee"]] = relationship("Employee", back_populates="verified_customers")
    accounts: Mapped[List["Account"]] = relationship("Account", back_populates="customer")
    beneficiaries: Mapped[List["Beneficiary"]] = relationship("Beneficiary", back_populates="customer")
    loans: Mapped[List["Loan"]] = relationship("Loan", back_populates="customer")
    fraud_alerts: Mapped[List["FraudAlert"]] = relationship("FraudAlert", back_populates="customer")

