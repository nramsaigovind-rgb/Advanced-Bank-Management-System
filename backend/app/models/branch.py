from datetime import datetime
from typing import List, Optional
from sqlalchemy import BigInteger, String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    branch_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    ifsc_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(60), nullable=False)
    state: Mapped[str] = mapped_column(String(60), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    employees: Mapped[List["Employee"]] = relationship("Employee", back_populates="branch")
    customers: Mapped[List["Customer"]] = relationship("Customer", back_populates="branch")
    accounts: Mapped[List["Account"]] = relationship("Account", back_populates="branch")
    loans: Mapped[List["Loan"]] = relationship("Loan", back_populates="branch")

