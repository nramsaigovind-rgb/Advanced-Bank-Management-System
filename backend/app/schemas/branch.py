from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class BranchBase(BaseModel):
    branch_code: str = Field(..., max_length=20)
    name: str = Field(..., max_length=100)
    ifsc_code: str = Field(..., max_length=20)
    address: str
    city: str = Field(..., max_length=60)
    state: str = Field(..., max_length=60)
    postal_code: str = Field(..., max_length=20)
    phone: str = Field(..., max_length=20)
    email: str = Field(..., max_length=100)
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

class BranchOut(BranchBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
