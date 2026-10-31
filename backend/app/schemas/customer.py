from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class CustomerBase(BaseModel):
    first_name: str = Field(..., max_length=60)
    last_name: str = Field(..., max_length=60)
    date_of_birth: date
    gender: str = Field(..., max_length=10)
    phone: str = Field(..., max_length=20)
    email: str = Field(..., max_length=120)
    address: str
    city: str = Field(..., max_length=60)
    state: str = Field(..., max_length=60)
    postal_code: str = Field(..., max_length=20)
    pan_number: str = Field(..., min_length=10, max_length=20)
    kyc_document_type: str = Field(..., max_length=50)
    kyc_document_id: str = Field(..., max_length=50)

class CustomerCreate(CustomerBase):
    branch_id: int
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class CustomerUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None

class KYCVerifyRequest(BaseModel):
    kyc_status: str = Field(..., pattern="^(VERIFIED|REJECTED)$")
    remarks: Optional[str] = None

class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    branch_id: int
    customer_number: str
    kyc_status: str
    verified_by_employee_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
