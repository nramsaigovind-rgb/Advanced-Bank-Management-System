from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    username: str
    display_name: str
    permissions: List[str]
    user: Optional[Dict[str, Any]] = None

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    old_password: Optional[str] = None
    new_password: str = Field(..., min_length=6)

    def get_current_password(self) -> str:
        pwd = self.current_password or self.old_password
        if not pwd:
            raise ValueError("Current password is required")
        return pwd

class RegisterCustomerRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=100)
    password: str = Field(..., min_length=6)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., min_length=10, max_length=20)
    pan_number: str = Field(..., min_length=5, max_length=20)
    date_of_birth: Optional[str] = "1995-01-01"
    gender: Optional[str] = "OTHER"
    address: Optional[str] = "Customer Residence"
    city: Optional[str] = "Delhi"
    state: Optional[str] = "Delhi"
    postal_code: Optional[str] = "110001"
    branch_id: Optional[int] = None
