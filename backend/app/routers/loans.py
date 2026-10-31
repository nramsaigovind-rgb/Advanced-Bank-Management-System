import math
import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_roles, record_audit_event
from backend.app.models import Loan, LoanInstallment, LoanPayment, Account, Customer, User, Transaction, LedgerEntry, OutboxEvent

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

class LoanInstallmentRepayRequest(BaseModel):
    source_account_id: int

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

    if loan.customer and loan.customer.user_id:
        from backend.app.services.notification_service import send_notification
        send_notification(
            db=db,
            user_id=loan.customer.user_id,
            title="Loan Approved",
            message=f"Congratulations! Your loan application {loan.loan_number} for ₹{loan.principal_amount:,.2f} has been approved.",
            notification_type="LOAN_APPROVED"
        )

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

    if loan.customer and loan.customer.user_id:
        from backend.app.services.notification_service import send_notification
        send_notification(
            db=db,
            user_id=loan.customer.user_id,
            title="Loan Disbursed",
            message=f"Loan {loan.loan_number} funds of ₹{loan.principal_amount:,.2f} have been disbursed to your account {dest_acc.account_number}.",
            notification_type="LOAN_DISBURSED"
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

@router.post("/installments/{installment_id}/repay")
def repay_loan_installment(
    installment_id: int,
    req: LoanInstallmentRepayRequest,
    request: Request,
    current_user: User = Depends(require_roles("customer", "employee", "admin")),
    db: Session = Depends(get_db)
):
    """
    Repay a loan installment in a single atomic ACID transaction:
    - Locks the account, installment, and loan rows with FOR UPDATE (ordered by id to prevent deadlocks)
    - Validates installment is PENDING or OVERDUE
    - Ensures caller owns the account (if customer)
    - Validates sufficient balance
    - Debits customer account and credits LOAN_SETTLEMENT system account
    - Writes Transaction (LOAN_REPAYMENT) + 2 Ledger entries + LoanPayment row
    - Updates installment to PAID and reduces loan balances
    - Closes loan if this is the final installment
    - Emits audit log + outbox event
    - Idempotent: returns HTTP 409 if installment is already PAID
    """
    # 1. Quick initial check before acquiring locks
    inst_check = db.query(LoanInstallment).filter(LoanInstallment.id == installment_id).first()
    if not inst_check:
        raise HTTPException(status_code=404, detail="Installment not found")
    if inst_check.status == "PAID":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Installment already paid")
    if inst_check.status not in ("PENDING", "OVERDUE"):
        raise HTTPException(status_code=400, detail=f"Installment cannot be repaid in status {inst_check.status}")

    loan_id = inst_check.loan_id

    # 2. Find or create LOAN_SETTLEMENT system account
    settlement_acc = db.query(Account).filter(
        (Account.account_number == "SYS-LOAN-SETTLEMENT") |
        (Account.account_type == "LOAN_SETTLEMENT")
    ).first()
    if not settlement_acc:
        settlement_acc = Account(
            account_number="SYS-LOAN-SETTLEMENT",
            customer_id=None,
            branch_id=1,
            account_type="LOAN_SETTLEMENT",
            balance=Decimal("0.0000"),
            currency="INR",
            status="ACTIVE",
            is_system_account=True
        )
        db.add(settlement_acc)
        db.flush()

    # 3. Lock Accounts ordered by ID ascending (eliminates deadlocks)
    acc_ids = sorted([req.source_account_id, settlement_acc.id])
    locked_accounts = db.query(Account).filter(Account.id.in_(acc_ids)).order_by(Account.id.asc()).with_for_update().all()
    locked_acc_map = {a.id: a for a in locked_accounts}

    source_acc = locked_acc_map.get(req.source_account_id)
    dest_sys_acc = locked_acc_map.get(settlement_acc.id)

    if not source_acc:
        raise HTTPException(status_code=404, detail="Source account not found")

    # 4. Lock Loan and LoanInstallment rows with FOR UPDATE
    loan = db.query(Loan).filter(Loan.id == loan_id).with_for_update().first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    installment = db.query(LoanInstallment).filter(LoanInstallment.id == installment_id).with_for_update().first()
    if not installment:
        raise HTTPException(status_code=404, detail="Installment not found")

    # Idempotency check inside row locks
    if installment.status == "PAID":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Installment already paid")
    if installment.status not in ("PENDING", "OVERDUE"):
        raise HTTPException(status_code=400, detail=f"Installment cannot be repaid in status {installment.status}")

    # 5. Authorization: validate ownership
    if current_user.role.name == "customer":
        cust_profile = current_user.customer_profile
        if not cust_profile:
            raise HTTPException(status_code=403, detail="Customer profile not found")
        if source_acc.customer_id != cust_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Source account does not belong to the authenticated customer")
        if loan.customer_id != cust_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Loan does not belong to the authenticated customer")

    # 6. Validate balance & account status
    if source_acc.status != "ACTIVE":
        raise HTTPException(status_code=400, detail=f"Source account is {source_acc.status}")

    if source_acc.balance < installment.total_amount:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Insufficient funds: available {float(source_acc.balance)}, required {float(installment.total_amount)}"
        )

    # 7. Execute atomic balance mutation (debit source, credit settlement system account)
    source_acc.balance -= installment.total_amount
    dest_sys_acc.balance += installment.total_amount

    # 8. Create Transaction row
    tx_ref = f"TXN-REPAY-{installment.id}-{uuid.uuid4().hex[:8].upper()}"
    tx = Transaction(
        reference_no=tx_ref,
        source_account_id=source_acc.id,
        destination_account_id=dest_sys_acc.id,
        amount=installment.total_amount,
        currency="INR",
        transaction_type="LOAN_REPAYMENT",
        status="COMPLETED",
        description=f"Repayment for {loan.loan_number} installment #{installment.installment_number}",
        completed_at=datetime.utcnow()
    )
    db.add(tx)
    db.flush()

    # 9. Write Double-Entry Ledger Entries
    le_debit = LedgerEntry(
        transaction_id=tx.id,
        account_id=source_acc.id,
        entry_type="DEBIT",
        amount=installment.total_amount,
        balance_after=source_acc.balance,
        posted_at=tx.created_at
    )
    le_credit = LedgerEntry(
        transaction_id=tx.id,
        account_id=dest_sys_acc.id,
        entry_type="CREDIT",
        amount=installment.total_amount,
        balance_after=dest_sys_acc.balance,
        posted_at=tx.created_at
    )
    db.add_all([le_debit, le_credit])

    # 10. Record LoanPayment row
    payment = LoanPayment(
        loan_id=loan.id,
        installment_id=installment.id,
        transaction_id=tx.id,
        amount_paid=installment.total_amount,
        principal_paid=installment.principal_component,
        interest_paid=installment.interest_component,
        payment_date=datetime.utcnow()
    )
    db.add(payment)

    # 11. Update Installment status
    installment.status = "PAID"
    installment.paid_at = datetime.utcnow()

    # 12. Reduce Loan outstanding balances
    loan.outstanding_principal = max(Decimal("0.0000"), loan.outstanding_principal - installment.principal_component)
    loan.outstanding_interest = max(Decimal("0.0000"), loan.outstanding_interest - installment.interest_component)

    # 13. Close loan if all installments are paid
    unpaid_count = db.query(LoanInstallment).filter(
        LoanInstallment.loan_id == loan.id,
        LoanInstallment.id != installment.id,
        LoanInstallment.status.in_(["PENDING", "OVERDUE"])
    ).count()

    loan_closed = False
    if unpaid_count == 0:
        loan.status = "CLOSED"
        loan_closed = True

    # 14. Relational Audit Log
    record_audit_event(
        db=db,
        user=current_user,
        action="LOAN_REPAYMENT",
        entity_type="LoanInstallment",
        entity_id=str(installment.id),
        payload={
            "loan_id": loan.id,
            "installment_id": installment.id,
            "amount": float(installment.total_amount),
            "loan_closed": loan_closed,
            "outstanding_principal": float(loan.outstanding_principal)
        },
        request=request
    )

    # 15. Transactional Outbox Event
    outbox = OutboxEvent(
        event_id=str(uuid.uuid4()),
        event_type="LOAN_REPAYMENT_COMPLETED",
        aggregate_type="Loan",
        aggregate_id=str(loan.id),
        payload={
            "reference_no": tx.reference_no,
            "loan_id": loan.id,
            "loan_number": loan.loan_number,
            "installment_id": installment.id,
            "installment_number": installment.installment_number,
            "amount": float(installment.total_amount),
            "source_account_id": source_acc.id,
            "source_account_number": source_acc.account_number,
            "destination_account_id": dest_sys_acc.id,
            "destination_account_number": dest_sys_acc.account_number,
            "loan_status": loan.status,
            "timestamp": datetime.utcnow().isoformat()
        },
        status="PENDING"
    )
    db.add(outbox)
    db.commit()

    return {
        "status": "success",
        "message": f"Installment #{installment.installment_number} repaid successfully",
        "transaction_reference": tx.reference_no,
        "installment_id": installment.id,
        "amount_paid": float(installment.total_amount),
        "source_account_balance": float(source_acc.balance),
        "loan_status": loan.status,
        "outstanding_principal": float(loan.outstanding_principal),
        "paid_at": installment.paid_at.isoformat()
    }


