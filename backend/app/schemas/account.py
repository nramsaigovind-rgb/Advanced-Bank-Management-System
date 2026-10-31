from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class AccountCreate(BaseModel):
    customer_id: int
    branch_id: int
    account_type: str = Field(..., pattern="^(SAVINGS|CHECKING)$")
    initial_deposit: Decimal = Field(default=Decimal("1000.0000"), ge=0)

class AccountStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|FROZEN|DORMANT|CLOSED)$")
    reason: Optional[str] = None

class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_number: str
    customer_id: Optional[int]
    branch_id: Optional[int]
    account_type: str
    balance: Decimal
    currency: str
    status: str
    is_system_account: bool
    version: int
    created_at: datetime
    updated_at: datetime

class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    card_number_masked: str
    card_type: str
    expiry_month: int
    expiry_year: int
    daily_atm_limit: Decimal
    daily_pos_limit: Decimal
    is_blocked: bool
    block_reason: Optional[str] = None
    created_at: datetime

class CardStatusUpdate(BaseModel):
    is_blocked: bool
    reason: Optional[str] = None

class BeneficiaryCreate(BaseModel):
    beneficiary_name: str = Field(..., max_length=100)
    account_number: str = Field(..., max_length=30)
    ifsc_code: str = Field(..., max_length=20)
    bank_name: str = Field(..., max_length=100)
    daily_limit: Decimal = Field(default=Decimal("200000.00"), gt=0)

class BeneficiaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    beneficiary_name: str
    account_number: str
    ifsc_code: str
    bank_name: str
    daily_limit: Decimal
    is_verified: bool
    created_at: datetime
