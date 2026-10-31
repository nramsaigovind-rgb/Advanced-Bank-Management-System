from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class EmployeeBase(BaseModel):
    first_name: str = Field(..., max_length=60)
    last_name: str = Field(..., max_length=60)
    designation: str = Field(..., max_length=60)
    department: str = Field(..., max_length=60)
    phone: str = Field(..., max_length=20)
    hire_date: date
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    branch_id: int
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=120)
    password: str = Field(..., min_length=6)
    role_name: str = Field("employee", pattern="^(employee|branch_manager)$")

class EmployeeUpdate(BaseModel):
    designation: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    branch_id: int
    employee_code: str
    created_at: datetime
