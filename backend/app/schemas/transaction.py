from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class TransferRequest(BaseModel):
    source_account_id: int
    destination_account_number: Optional[str] = None
    destination_account_id: Optional[int] = None
    amount: Decimal = Field(..., gt=Decimal("0.0000"))
    description: Optional[str] = None
    remarks: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, max_length=64)

class DepositWithdrawRequest(BaseModel):
    account_id: int
    amount: Decimal = Field(..., gt=Decimal("0.0000"))
    description: Optional[str] = None
    remarks: Optional[str] = None

class ConcurrencyRaceRequest(BaseModel):
    account_id: Optional[int] = None
    source_account_id: Optional[int] = None
    destination_account_id: Optional[int] = None
    destination_account_number: Optional[str] = None
    tx1_amount: Optional[Decimal] = Decimal("4000.0000")
    tx2_amount: Optional[Decimal] = Decimal("3000.0000")
    amount_1: Optional[Decimal] = None
    amount_2: Optional[Decimal] = None
    delay_ms: Optional[int] = 100

class SimulateFailureRequest(BaseModel):
    source_account_id: Optional[int] = 5
    destination_account_id: Optional[int] = 6
    destination_account_number: Optional[str] = None
    amount: Optional[Decimal] = Decimal("2500.0000")
    fail_stage: Optional[str] = "during_ledger"

class LedgerEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transaction_id: int
    account_id: int
    entry_type: str
    amount: Decimal
    balance_after: Decimal
    posted_at: datetime

class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_no: str
    idempotency_key: Optional[str] = None
    source_account_id: int
    destination_account_id: int
    amount: Decimal
    currency: str
    transaction_type: str
    status: str
    description: str
    created_at: datetime
    completed_at: Optional[datetime] = None

class TransactionReceipt(BaseModel):
    reference_no: str
    transaction_type: str
    status: str
    source_account_number: str
    destination_account_number: str
    amount: Decimal
    currency: str
    source_balance_after: Decimal
    description: str
    timestamp: datetime
    ledger_entries_count: int = 2
    execution_time_ms: float
