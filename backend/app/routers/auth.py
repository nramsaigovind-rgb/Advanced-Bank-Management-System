from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.auth import get_current_user, record_audit_event
from backend.app.core.mongo import get_mongo_db
from backend.app.core.rate_limiter import check_login_rate_limit_helper
from backend.app.models import User, Role, Customer, Branch
from backend.app.schemas.auth import LoginRequest, TokenResponse, UserOut, ChangePasswordRequest, RegisterCustomerRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    # 5 attempts per minute per IP + username
    check_login_rate_limit_helper(request, req.username)

    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    if not verify_password(req.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.is_locked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    if user.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is locked due to security policy")

    # Reset failure attempts and update last_login
    user.failed_login_attempts = 0
    user.last_login = datetime.utcnow()
    db.commit()

    # Permissions list
    permissions = [p.code for p in user.role.permissions]

    # Generate token
    token = create_access_token(subject=user.id, role=user.role.name)

    # Determine display name
    display_name = user.username
    if user.customer_profile:
        display_name = f"{user.customer_profile.first_name} {user.customer_profile.last_name}"
    elif user.employee_profile:
        display_name = f"{user.employee_profile.first_name} {user.employee_profile.last_name}"

    # Audit login
    record_audit_event(
        db=db,
        user=user,
        action="USER_LOGIN_SUCCESS",
        entity_type="User",
        entity_id=str(user.id),
        payload={"username": user.username, "role": user.role.name},
        request=request
    )
    db.commit()

    user_dict = {
        "id": user.id,
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.name,
        "display_name": display_name,
        "customer_id": user.customer_profile.id if user.customer_profile else None,
        "employee_id": user.employee_profile.id if user.employee_profile else None,
        "branch_id": (
            user.customer_profile.branch_id if user.customer_profile
            else (user.employee_profile.branch_id if user.employee_profile else 1)
        ),
        "permissions": permissions,
    }

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role.name,
        user_id=user.id,
        username=user.username,
        display_name=display_name,
        permissions=permissions,
        user=user_dict
    )

@router.get("/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    profile_data = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role.name,
        "role_display_name": current_user.role.display_name,
        "is_active": current_user.is_active,
        "last_login": current_user.last_login,
        "permissions": [p.code for p in current_user.role.permissions]
    }
    if current_user.customer_profile:
        c = current_user.customer_profile
        profile_data["customer"] = {
            "customer_id": c.id,
            "customer_number": c.customer_number,
            "name": f"{c.first_name} {c.last_name}",
            "phone": c.phone,
            "email": c.email,
            "kyc_status": c.kyc_status,
            "branch_id": c.branch_id
        }
    elif current_user.employee_profile:
        e = current_user.employee_profile
        profile_data["employee"] = {
            "employee_id": e.id,
            "employee_code": e.employee_code,
            "name": f"{e.first_name} {e.last_name}",
            "designation": e.designation,
            "department": e.department,
            "branch_id": e.branch_id
        }
    return profile_data

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_customer(req: RegisterCustomerRequest, request: Request, db: Session = Depends(get_db)):
    # Check if username or email already exists
    if db.query(User).filter(or_(User.username == req.username, User.email == req.email)).first():
        raise HTTPException(status_code=400, detail="Username or email already registered")

    if db.query(Customer).filter(or_(Customer.phone == req.phone, Customer.pan_number == req.pan_number)).first():
        raise HTTPException(status_code=400, detail="Customer with this phone or PAN already exists")

    # Select branch
    if req.branch_id:
        branch = db.query(Branch).filter(Branch.id == req.branch_id).first()
    else:
        branch = db.query(Branch).filter(Branch.is_active == True).first()

    if not branch:
        raise HTTPException(status_code=400, detail="No active branch found in system")

    role_customer = db.query(Role).filter(Role.name == "customer").first()
    if not role_customer:
        raise HTTPException(status_code=500, detail="Customer role not configured")

    # Create User
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

    dob = None
    if req.date_of_birth:
        try:
            dob = datetime.strptime(req.date_of_birth, "%Y-%m-%d").date()
        except Exception:
            dob = None

    customer = Customer(
        user_id=user.id,
        branch_id=branch.id,
        customer_number=cust_num,
        first_name=req.first_name,
        last_name=req.last_name,
        date_of_birth=dob,
        gender=req.gender or "OTHER",
        phone=req.phone,
        email=req.email,
        address=req.address or "Address",
        city=req.city or branch.city,
        state=req.state or branch.state,
        postal_code=req.postal_code or branch.postal_code,
        pan_number=req.pan_number,
        kyc_status="PENDING",
        kyc_document_type="PAN_CARD",
        kyc_document_id=req.pan_number
    )
    db.add(customer)
    db.flush()

    record_audit_event(
        db=db,
        user=user,
        action="CUSTOMER_SELF_REGISTRATION",
        entity_type="Customer",
        entity_id=str(customer.id),
        payload={"customer_number": cust_num, "username": req.username},
        request=request
    )
    db.commit()

    return {
        "message": "Registration successful. Please login to access your portal.",
        "user_id": user.id,
        "username": user.username,
        "customer_number": cust_num,
        "kyc_status": "PENDING"
    }

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        curr_pwd = req.get_current_password()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not verify_password(curr_pwd, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    if curr_pwd == req.new_password:
        raise HTTPException(status_code=400, detail="New password cannot be the same as current password")

    current_user.password_hash = get_password_hash(req.new_password)
    record_audit_event(
        db=db,
        user=current_user,
        action="USER_PASSWORD_CHANGE",
        entity_type="User",
        entity_id=str(current_user.id),
        payload={"username": current_user.username},
        request=request
    )
    db.commit()
    return {"message": "Password updated successfully"}

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record_audit_event(
        db=db,
        user=current_user,
        action="USER_LOGOUT",
        entity_type="User",
        entity_id=str(current_user.id),
        payload={"username": current_user.username},
        request=request
    )
    db.commit()
    return {"message": "Logged out successfully"}

