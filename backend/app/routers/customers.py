from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_roles, record_audit_event
from backend.app.core.security import get_password_hash
from backend.app.models import Customer, User, Role, Branch
from backend.app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut, KYCVerifyRequest

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = Query(None, description="Search by name, phone, email, or customer number"),
    kyc_status: Optional[str] = Query(None),
    branch_id: Optional[int] = Query(None),
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_roles("admin", "branch_manager", "employee")),
    db: Session = Depends(get_db)
):
    query = db.query(Customer)
    # Branch managers only see their branch if not admin
    if current_user.role.name == "branch_manager" and current_user.employee_profile:
        query = query.filter(Customer.branch_id == current_user.employee_profile.branch_id)
    elif branch_id:
        query = query.filter(Customer.branch_id == branch_id)

    if kyc_status:
        query = query.filter(Customer.kyc_status == kyc_status)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Customer.first_name.ilike(search_pattern),
                Customer.last_name.ilike(search_pattern),
                Customer.phone.ilike(search_pattern),
                Customer.email.ilike(search_pattern),
                Customer.customer_number.ilike(search_pattern),
                Customer.pan_number.ilike(search_pattern)
            )
        )

    return query.order_by(Customer.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/me", response_model=CustomerOut)
def get_my_customer_profile(
    current_user: User = Depends(require_roles("customer")),
    db: Session = Depends(get_db)
):
    if not current_user.customer_profile:
        raise HTTPException(status_code=404, detail="Customer profile not found")
    return current_user.customer_profile

@router.get("/{id}", response_model=CustomerOut)
def get_customer_by_id(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Access check: customers can only view their own profile
    if current_user.role.name == "customer":
        if not current_user.customer_profile or current_user.customer_profile.id != customer.id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only view your own customer profile")

    return customer

@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def register_customer(
    req: CustomerCreate,
    request: Request,
    current_user: User = Depends(require_roles("admin", "employee")),
    db: Session = Depends(get_db)
):
    # Check if username or email already exists
    if db.query(User).filter(or_(User.username == req.username, User.email == req.email)).first():
        raise HTTPException(status_code=400, detail="Username or email already registered")

    if db.query(Customer).filter(or_(Customer.phone == req.phone, Customer.pan_number == req.pan_number)).first():
        raise HTTPException(status_code=400, detail="Customer with this phone or PAN already exists")

    branch = db.query(Branch).filter(Branch.id == req.branch_id).first()
    if not branch:
        raise HTTPException(status_code=400, detail="Invalid branch ID")

    role_customer = db.query(Role).filter(Role.name == "customer").first()
    user = User(
        username=req.username,
        email=req.email,
        password_hash=get_password_hash(req.password),
        role_id=role_customer.id,
        is_active=True
    )
    db.add(user)
    db.flush()

    # Generate customer number
    cust_count = db.query(Customer).count()
    cust_num = f"CUST-{20260000 + cust_count + 1}"

    customer = Customer(
        user_id=user.id,
        branch_id=branch.id,
        customer_number=cust_num,
        first_name=req.first_name,
        last_name=req.last_name,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        phone=req.phone,
        email=req.email,
        address=req.address,
        city=req.city,
        state=req.state,
        postal_code=req.postal_code,
        pan_number=req.pan_number,
        kyc_status="PENDING",
        kyc_document_type=req.kyc_document_type,
        kyc_document_id=req.kyc_document_id
    )
    db.add(customer)
    db.flush()

    record_audit_event(
        db=db,
        user=current_user,
        action="CUSTOMER_REGISTRATION",
        entity_type="Customer",
        entity_id=str(customer.id),
        payload={"customer_number": cust_num, "name": f"{req.first_name} {req.last_name}"},
        request=request
    )
    db.commit()
    db.refresh(customer)
    return customer

@router.patch("/{id}/kyc", response_model=CustomerOut)
def verify_kyc(
    id: int,
    req: KYCVerifyRequest,
    request: Request,
    current_user: User = Depends(require_roles("admin", "employee", "branch_manager")),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    old_status = customer.kyc_status
    customer.kyc_status = req.kyc_status
    customer.verified_by_employee_id = current_user.employee_profile.id if current_user.employee_profile else None
    customer.verified_at = datetime.utcnow()

    record_audit_event(
        db=db,
        user=current_user,
        action="CUSTOMER_KYC_VERIFICATION",
        entity_type="Customer",
        entity_id=str(customer.id),
        payload={"old_status": old_status, "new_status": req.kyc_status, "remarks": req.remarks},
        request=request
    )
    db.commit()
    db.refresh(customer)
    return customer

