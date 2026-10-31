from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_roles, record_audit_event
from backend.app.core.security import get_password_hash
from backend.app.models import Employee, User, Role, Branch
from backend.app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate

router = APIRouter(prefix="/api/employees", tags=["Employees"])

@router.get("", response_model=List[EmployeeOut])
def list_employees(
    branch_id: Optional[int] = None,
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    query = db.query(Employee)
    if current_user.role.name == "branch_manager" and current_user.employee_profile:
        query = query.filter(Employee.branch_id == current_user.employee_profile.branch_id)
    elif branch_id:
        query = query.filter(Employee.branch_id == branch_id)
    return query.all()

@router.get("/me", response_model=EmployeeOut)
def get_my_employee_profile(
    current_user: User = Depends(require_roles("employee", "branch_manager", "admin")),
    db: Session = Depends(get_db)
):
    if not current_user.employee_profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return current_user.employee_profile

@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    req: EmployeeCreate,
    request: Request,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    role = db.query(Role).filter(Role.name == req.role_name).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    user = User(
        username=req.username,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role_id=role.id,
        is_active=req.is_active
    )
    db.add(user)
    db.flush()

    emp_count = db.query(Employee).count()
    emp_code = f"EMP-{202600 + emp_count + 1}"

    employee = Employee(
        user_id=user.id,
        branch_id=req.branch_id,
        employee_code=emp_code,
        first_name=req.first_name,
        last_name=req.last_name,
        designation=req.designation,
        department=req.department,
        phone=req.phone,
        hire_date=req.hire_date,
        is_active=req.is_active
    )
    db.add(employee)
    db.flush()

    record_audit_event(
        db=db,
        user=current_user,
        action="EMPLOYEE_ONBOARDING",
        entity_type="Employee",
        entity_id=str(employee.id),
        payload={"employee_code": emp_code, "name": f"{req.first_name} {req.last_name}", "role": req.role_name},
        request=request
    )
    db.commit()
    db.refresh(employee)
    return employee

