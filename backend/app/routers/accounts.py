import uuid
import hashlib
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_roles, record_audit_event
from backend.app.models import Account, Customer, Branch, Card, Beneficiary, User
from backend.app.models.transaction import LedgerEntry
from backend.app.services.statement_service import generate_csv_statement, generate_pdf_statement
from backend.app.schemas.account import (
    AccountCreate, AccountStatusUpdate, AccountOut,
    CardOut, CardStatusUpdate, BeneficiaryCreate, BeneficiaryOut
)

router = APIRouter(prefix="/api/accounts", tags=["Accounts & Cards"])

@router.get("", response_model=List[AccountOut])
def list_accounts(
    branch_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Account).filter(Account.is_system_account == False)

    if current_user.role.name == "customer":
        if not current_user.customer_profile:
            return []
        return query.filter(Account.customer_id == current_user.customer_profile.id).all()

    if current_user.role.name == "branch_manager" and current_user.employee_profile:
        query = query.filter(Account.branch_id == current_user.employee_profile.branch_id)
    elif branch_id:
        query = query.filter(Account.branch_id == branch_id)

    if customer_id:
        query = query.filter(Account.customer_id == customer_id)

    return query.all()

@router.get("/{id}", response_model=AccountOut)
def get_account_by_id(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if current_user.role.name == "customer":
        if not current_user.customer_profile or account.customer_id != current_user.customer_profile.id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot access other customers' accounts")

    return account

@router.get("/{id}/statement")
def export_account_statement(
    id: int,
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if current_user.role.name == "customer":
        if not current_user.customer_profile or account.customer_id != current_user.customer_profile.id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot access other customers' statements")

    f_dt = None
    t_dt = None
    query = db.query(LedgerEntry).filter(LedgerEntry.account_id == account.id)

    if from_date:
        try:
            f_dt = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.filter(LedgerEntry.posted_at >= f_dt)
        except Exception:
            pass

    if to_date:
        try:
            t_dt = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(LedgerEntry.posted_at <= t_dt)
        except Exception:
            pass

    entries = query.order_by(LedgerEntry.posted_at.asc()).all()
    customer = account.customer

    if format.lower() == "csv":
        csv_data = generate_csv_statement(account=account, customer=customer, entries=entries)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=statement_{account.account_number}.csv"}
        )
    else:
        pdf_bytes = generate_pdf_statement(
            account=account,
            customer=customer,
            entries=entries,
            from_date=f_dt,
            to_date=t_dt
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=statement_{account.account_number}.pdf"}
        )


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(
    req: AccountCreate,
    request: Request,
    current_user: User = Depends(require_roles("admin", "employee")),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == req.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    branch = db.query(Branch).filter(Branch.id == req.branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Generate 10-digit account number: 1000 + random 6 digits
    acc_count = db.query(Account).count()
    acc_num = f"{'1' if req.account_type == 'SAVINGS' else '2'}000{202600 + acc_count + 1:06d}"

    account = Account(
        account_number=acc_num,
        customer_id=customer.id,
        branch_id=branch.id,
        account_type=req.account_type,
        balance=req.initial_deposit,
        currency="INR",
        status="ACTIVE",
        is_system_account=False
    )
    db.add(account)
    db.flush()

    # Issue Debit Card automatically
    card_plain = f"4532{acc_count+10:02d}{uuid.uuid4().int % 100000000:08d}"
    card_hash = hashlib.sha256(card_plain.encode()).hexdigest()
    card = Card(
        account_id=account.id,
        card_number_masked=f"4532 •••• •••• {card_plain[-4:]}",
        card_number_hash=card_hash,
        card_type="DEBIT",
        expiry_month=12,
        expiry_year=2029,
        daily_atm_limit=Decimal("50000.00"),
        daily_pos_limit=Decimal("100000.00"),
        is_blocked=False
    )
    db.add(card)

    record_audit_event(
        db=db,
        user=current_user,
        action="ACCOUNT_CREATION",
        entity_type="Account",
        entity_id=str(account.id),
        payload={"account_number": acc_num, "type": req.account_type, "customer_id": customer.id},
        request=request
    )
    db.commit()
    db.refresh(account)
    return account

@router.patch("/{id}/status", response_model=AccountOut)
def update_account_status(
    id: int,
    req: AccountStatusUpdate,
    request: Request,
    current_user: User = Depends(require_roles("admin", "employee", "branch_manager")),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    old_status = account.status
    account.status = req.status
    account.version += 1

    record_audit_event(
        db=db,
        user=current_user,
        action="ACCOUNT_STATUS_CHANGE",
        entity_type="Account",
        entity_id=str(account.id),
        payload={"old_status": old_status, "new_status": req.status, "reason": req.reason},
        request=request
    )
    db.commit()
    db.refresh(account)
    return account

@router.get("/{id}/cards", response_model=List[CardOut])
def get_account_cards(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if current_user.role.name == "customer":
        if not current_user.customer_profile or account.customer_id != current_user.customer_profile.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return db.query(Card).filter(Card.account_id == id).all()

@router.patch("/cards/{card_id}/status", response_model=CardOut)
def update_card_status(
    card_id: int,
    req: CardStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if current_user.role.name == "customer":
        if not current_user.customer_profile or card.account.customer_id != current_user.customer_profile.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    card.is_blocked = req.is_blocked
    card.block_reason = req.reason

    record_audit_event(
        db=db,
        user=current_user,
        action="CARD_STATUS_UPDATE",
        entity_type="Card",
        entity_id=str(card.id),
        payload={"is_blocked": req.is_blocked, "reason": req.reason},
        request=request
    )
    db.commit()
    db.refresh(card)
    return card

# ---------------- Beneficiary Routes ----------------

@router.get("/beneficiaries/list", response_model=List[BeneficiaryOut])
def list_beneficiaries(
    current_user: User = Depends(require_roles("customer")),
    db: Session = Depends(get_db)
):
    if not current_user.customer_profile:
        return []
    return db.query(Beneficiary).filter(Beneficiary.customer_id == current_user.customer_profile.id).all()

@router.post("/beneficiaries", response_model=BeneficiaryOut, status_code=status.HTTP_201_CREATED)
def add_beneficiary(
    req: BeneficiaryCreate,
    request: Request,
    current_user: User = Depends(require_roles("customer")),
    db: Session = Depends(get_db)
):
    if not current_user.customer_profile:
        raise HTTPException(status_code=404, detail="Customer profile missing")

    cust_id = current_user.customer_profile.id
    existing = db.query(Beneficiary).filter_by(customer_id=cust_id, account_number=req.account_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Beneficiary already saved")

    ben = Beneficiary(
        customer_id=cust_id,
        beneficiary_name=req.beneficiary_name,
        account_number=req.account_number,
        ifsc_code=req.ifsc_code,
        bank_name=req.bank_name,
        daily_limit=req.daily_limit,
        is_verified=True
    )
    db.add(ben)
    db.flush()

    record_audit_event(
        db=db,
        user=current_user,
        action="BENEFICIARY_ADDED",
        entity_type="Beneficiary",
        entity_id=str(ben.id),
        payload={"name": req.beneficiary_name, "account": req.account_number},
        request=request
    )
    db.commit()
    db.refresh(ben)
    return ben

@router.delete("/beneficiaries/{id}")
def delete_beneficiary(
    id: int,
    request: Request,
    current_user: User = Depends(require_roles("customer")),
    db: Session = Depends(get_db)
):
    if not current_user.customer_profile:
        raise HTTPException(status_code=404, detail="Customer profile missing")

    ben = db.query(Beneficiary).filter_by(id=id, customer_id=current_user.customer_profile.id).first()
    if not ben:
        raise HTTPException(status_code=404, detail="Beneficiary not found")

    db.delete(ben)
    record_audit_event(
        db=db,
        user=current_user,
        action="BENEFICIARY_DELETED",
        entity_type="Beneficiary",
        entity_id=str(id),
        payload={"account": ben.account_number},
        request=request
    )
    db.commit()
    return {"message": "Beneficiary removed successfully"}

