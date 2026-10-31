import math
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_roles, record_audit_event
from backend.app.models import Loan, LoanInstallment, LoanPayment, Account, Customer, User, Transaction, LedgerEntry

router = APIRouter(prefix="/api/loans", tags=["Loans & Amortization"])

class LoanApplyRequest(BaseModel):
    disbursement_account_id: int
    loan_type: str = Field(..., pattern="^(PERSONAL|HOME|AUTO|BUSINESS)$")
    principal_amount: Decimal = Field(..., gt=Decimal("0.0000"))
    annual_interest_rate: Decimal = Field(default=Decimal("12.00"), ge=0, le=100)
    tenure_months: int = Field(..., ge=1, le=360)

class LoanPaymentRequest(BaseModel):
    source_account_id: int
    amount: Decimal = Field(..., gt=Decimal("0.0000"))

@router.get("")
def list_loans(
    branch_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Loan)
    if current_user.role.name == "customer":
        if not current_user.customer_profile:
            return []
        query = query.filter(Loan.customer_id == current_user.customer_profile.id)
    elif current_user.role.name == "branch_manager" and current_user.employee_profile:
        query = query.filter(Loan.branch_id == current_user.employee_profile.branch_id)
    elif branch_id:
        query = query.filter(Loan.branch_id == branch_id)

    if customer_id:
        query = query.filter(Loan.customer_id == customer_id)

    loans = query.all()
    out = []
    for l in loans:
        out.append({
            "id": l.id,
            "loan_number": l.loan_number,
            "customer_id": l.customer_id,
            "customer_name": f"{l.customer.first_name} {l.customer.last_name}" if l.customer else "Unknown",
            "loan_type": l.loan_type,
            "principal_amount": float(l.principal_amount),
            "annual_interest_rate": float(l.annual_interest_rate),
            "tenure_months": l.tenure_months,
            "monthly_emi": float(l.monthly_emi),
            "outstanding_principal": float(l.outstanding_principal),
            "outstanding_interest": float(l.outstanding_interest),
            "status": l.status,
            "applied_at": l.applied_at,
            "disbursed_at": l.disbursed_at
        })
    return out

@router.post("", status_code=status.HTTP_201_CREATED)
def apply_loan(
    req: LoanApplyRequest,
    request: Request,
    current_user: User = Depends(require_roles("customer", "employee", "admin")),
    db: Session = Depends(get_db)
):
    acc = db.query(Account).filter(Account.id == req.disbursement_account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Disbursement account not found")

    customer = acc.customer
    if not customer:
        raise HTTPException(status_code=400, detail="Account is not tied to a registered customer")

    if current_user.role.name == "customer" and current_user.customer_profile.id != customer.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Reducing-balance EMI calculation
    # EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    monthly_r = float((req.annual_interest_rate / Decimal("100")) / Decimal("12"))
    p = float(req.principal_amount)
    n = req.tenure_months

    if monthly_r > 0:
        emi_val = p * (monthly_r * math.pow(1 + monthly_r, n)) / (math.pow(1 + monthly_r, n) - 1)
    else:
        emi_val = p / n
    monthly_emi = Decimal(str(round(emi_val, 4)))

    loan_count = db.query(Loan).count()
    loan_num = f"LN-{datetime.now().year}-{1000 + loan_count + 1}"

    loan = Loan(
        loan_number=loan_num,
        customer_id=customer.id,
        branch_id=acc.branch_id or customer.branch_id,
        disbursement_account_id=acc.id,
        loan_type=req.loan_type,
        principal_amount=req.principal_amount,
        annual_interest_rate=req.annual_interest_rate,
        tenure_months=req.tenure_months,
        monthly_emi=monthly_emi,
        outstanding_principal=req.principal_amount,
        outstanding_interest=Decimal("0.0000"),
        status="APPLIED"
    )
    db.add(loan)
    db.flush()

    record_audit_event(
        db=db,
        user=current_user,
        action="LOAN_APPLICATION",
        entity_type="Loan",
        entity_id=str(loan.id),
        payload={"loan_number": loan_num, "principal": float(req.principal_amount)},
        request=request
    )
    db.commit()
    db.refresh(loan)
    return {"message": "Loan applied successfully", "loan_id": loan.id, "loan_number": loan.loan_number, "monthly_emi": float(monthly_emi)}

@router.patch("/{id}/approve")
def approve_loan(
    id: int,
    request: Request,
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.id == id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "APPLIED":
        raise HTTPException(status_code=400, detail=f"Loan cannot be approved in {loan.status} status")

    loan.status = "APPROVED"
    loan.approved_at = datetime.utcnow()
    loan.approved_by_employee_id = current_user.employee_profile.id if current_user.employee_profile else None

    record_audit_event(
        db=db,
        user=current_user,
        action="LOAN_APPROVAL",
        entity_type="Loan",
        entity_id=str(loan.id),
        payload={"loan_number": loan.loan_number, "status": "APPROVED"},
        request=request
    )
    db.commit()
    return {"message": "Loan approved successfully", "loan_id": loan.id, "status": loan.status}

@router.post("/{id}/disburse")
def disburse_loan(
    id: int,
    request: Request,
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.id == id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "APPROVED":
        raise HTTPException(status_code=400, detail=f"Loan cannot be disbursed in {loan.status} status")

    dest_acc = db.query(Account).filter(Account.id == loan.disbursement_account_id).first()
    sys_disb = db.query(Account).filter(Account.account_number == "SYS-LOAN-DISBURSEMENT").first()
    if not dest_acc or not sys_disb:
        raise HTTPException(status_code=500, detail="Accounts missing for disbursement")

    # Credit customer account, debit system loan disbursement account
    dest_acc.balance += loan.principal_amount
    sys_disb.balance -= loan.principal_amount
    loan.status = "DISBURSED"
    loan.disbursed_at = datetime.utcnow()

    # Create disbursement transaction & ledger entries
    tx = Transaction(
        reference_no=f"TXN-DISB-{loan.loan_number}",
        source_account_id=sys_disb.id,
        destination_account_id=dest_acc.id,
        amount=loan.principal_amount,
        currency="INR",
        transaction_type="LOAN_DISBURSEMENT",
        status="COMPLETED",
        description=f"Loan disbursement for {loan.loan_number}"
    )
    db.add(tx)
    db.flush()

    db.add_all([
        LedgerEntry(transaction_id=tx.id, account_id=sys_disb.id, entry_type="DEBIT", amount=loan.principal_amount, balance_after=sys_disb.balance, posted_at=tx.created_at),
        LedgerEntry(transaction_id=tx.id, account_id=dest_acc.id, entry_type="CREDIT", amount=loan.principal_amount, balance_after=dest_acc.balance, posted_at=tx.created_at)
    ])

    # Generate Repayment Schedule (Amortization)
    monthly_r = float((loan.annual_interest_rate / Decimal("100")) / Decimal("12"))
    remaining_p = loan.principal_amount
    start_date = date.today() + timedelta(days=30)

    for i in range(1, loan.tenure_months + 1):
        interest_c = round(remaining_p * Decimal(str(monthly_r)), 4)
        principal_c = round(loan.monthly_emi - interest_c, 4)
        if i == loan.tenure_months:
            principal_c = remaining_p
            emi_amount = principal_c + interest_c
        else:
            emi_amount = loan.monthly_emi

        remaining_p -= principal_c
        inst = LoanInstallment(
            loan_id=loan.id,
            installment_number=i,
            due_date=start_date + timedelta(days=30 * (i - 1)),
            principal_component=principal_c,
            interest_component=interest_c,
            total_amount=emi_amount,
            status="PENDING"
        )
        db.add(inst)

    record_audit_event(
        db=db,
        user=current_user,
        action="LOAN_DISBURSEMENT",
        entity_type="Loan",
        entity_id=str(loan.id),
        payload={"loan_number": loan.loan_number, "amount": float(loan.principal_amount)},
        request=request
    )
    db.commit()
    return {"message": "Loan disbursed and amortization schedule generated successfully", "status": "DISBURSED"}

@router.get("/{id}/installments")
def get_loan_installments(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.id == id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if current_user.role.name == "customer" and current_user.customer_profile.id != loan.customer_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    installments = db.query(LoanInstallment).filter(LoanInstallment.loan_id == id).order_by(LoanInstallment.installment_number.asc()).all()
    return [{
        "id": inst.id,
        "installment_number": inst.installment_number,
        "due_date": inst.due_date,
        "principal_component": float(inst.principal_component),
        "interest_component": float(inst.interest_component),
        "total_amount": float(inst.total_amount),
        "status": inst.status,
        "paid_at": inst.paid_at
    } for inst in installments]

