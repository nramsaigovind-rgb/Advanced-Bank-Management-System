from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, DateTime, Text, ForeignKey, CheckConstraint, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    old_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), default="127.0.0.1", nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    record_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    alert_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    account_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    risk_score: Mapped[int] = mapped_column(nullable=False)
    severity: Mapped[str] = mapped_column(
        SAEnum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='severity_enum'),
        nullable=False,
        index=True
    )
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        SAEnum('NEW', 'UNDER_INVESTIGATION', 'RESOLVED', 'FALSE_POSITIVE', name='alert_status_enum'),
        default='NEW',
        nullable=False,
        index=True
    )
    investigated_by_employee_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("employees.id"), nullable=True)
    investigation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("risk_score BETWEEN 0 AND 100", name="chk_fa_score"),
    )

    account: Mapped[Optional["Account"]] = relationship("Account")
    customer: Mapped[Optional["Customer"]] = relationship("Customer", back_populates="fraud_alerts")
    investigated_by_employee: Mapped[Optional["Employee"]] = relationship("Employee", back_populates="investigated_alerts")

