import os
import sys
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models import Loan, LoanInstallment, Account, Customer, User, LoanPayment, Transaction

client = TestClient(app)

from backend.app.core.security import create_access_token

@pytest.fixture(scope="module")
def tokens():
    db = SessionLocal()
    admin = db.query(User).filter(User.username == "admin").first()
    alex = db.query(User).filter(User.username == "alex_turner").first()
    sarah = db.query(User).filter(User.username == "sarah_connor").first()
    
    admin_tok = create_access_token(subject=admin.id, role=admin.role.name)
    alex_tok = create_access_token(subject=alex.id, role=alex.role.name)
    sarah_tok = create_access_token(subject=sarah.id, role=sarah.role.name)
    db.close()

    return {
        "alex": alex_tok,
        "sarah": sarah_tok,
        "admin": admin_tok
    }

def test_repay_installment_insufficient_funds(tokens):
    """Alex attempts to pay an installment using an account that has insufficient funds."""
    db = SessionLocal()
    # Loan for Alex (customer_id = 1)
    loan = db.query(Loan).filter(Loan.customer_id == 1, Loan.status == "DISBURSED").first()
    assert loan is not None, "Alex must have an active loan"
    inst = db.query(LoanInstallment).filter(LoanInstallment.loan_id == loan.id, LoanInstallment.status == "PENDING").first()
    assert inst is not None, "Alex must have a pending installment"

    # Alex's account
    alex_acc = db.query(Account).filter(Account.customer_id == 1).first()
    # Temporarily set balance lower than installment
    orig_balance = alex_acc.balance
    alex_acc.balance = Decimal("10.0000")
    db.commit()

    inst_id = inst.id
    acc_id = alex_acc.id
    db.close()

    try:
        headers = {"Authorization": f"Bearer {tokens['alex']}"}
        res = client.post(
            f"/api/loans/installments/{inst_id}/repay",
            headers=headers,
            json={"source_account_id": acc_id}
        )
        assert res.status_code == 422
        assert "Insufficient funds" in res.json()["detail"]
    finally:
        # Restore balance
        db = SessionLocal()
        acc = db.query(Account).filter(Account.id == acc_id).first()
        acc.balance = orig_balance
        db.commit()
        db.close()

def test_repay_installment_wrong_customer_forbidden(tokens):
    """Sarah attempts to pay Alex's loan or Alex attempts to pay with Sarah's account."""
    db = SessionLocal()
    loan = db.query(Loan).filter(Loan.customer_id == 1, Loan.status == "DISBURSED").first()
    inst = db.query(LoanInstallment).filter(LoanInstallment.loan_id == loan.id, LoanInstallment.status == "PENDING").first()
    sarah_acc = db.query(Account).filter(Account.customer_id == 2).first()
    inst_id = inst.id
    sarah_acc_id = sarah_acc.id
    db.close()

    # Sarah token calling with Alex's installment
    headers = {"Authorization": f"Bearer {tokens['sarah']}"}
    res = client.post(
        f"/api/loans/installments/{inst_id}/repay",
        headers=headers,
        json={"source_account_id": sarah_acc_id}
    )
    assert res.status_code == 403
    assert "Loan does not belong" in res.json()["detail"] or "Forbidden" in res.json()["detail"]

def test_repay_installment_success_and_idempotency(tokens):
    """Successfully repay an installment, verify double-entry and loan update, then verify 409 on re-payment."""
    db = SessionLocal()
    # Elena or Sarah loan
    loan = db.query(Loan).filter(Loan.customer_id == 2, Loan.status == "DISBURSED").first()
    if not loan:
        loan = db.query(Loan).filter(Loan.status == "DISBURSED").first()
    inst = db.query(LoanInstallment).filter(LoanInstallment.loan_id == loan.id, LoanInstallment.status == "PENDING").first()
    sarah_acc = db.query(Account).filter(Account.customer_id == loan.customer_id).first()
    
    # Ensure sufficient balance
    if sarah_acc.balance < inst.total_amount:
        sarah_acc.balance += Decimal("500000.0000")
        db.commit()

    inst_id = inst.id
    acc_id = sarah_acc.id
    emi_amount = Decimal(str(inst.total_amount))
    init_balance = sarah_acc.balance
    init_loan_principal = loan.outstanding_principal
    db.close()

    headers = {"Authorization": f"Bearer {tokens['admin']}"} # Admin can act or Sarah
    res = client.post(
        f"/api/loans/installments/{inst_id}/repay",
        headers=headers,
        json={"source_account_id": acc_id}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["installment_id"] == inst_id
    assert data["status"] == "success"
    assert "transaction_reference" in data

    # Verify Database state
    db = SessionLocal()
    reloaded_inst = db.query(LoanInstallment).filter(LoanInstallment.id == inst_id).first()
    assert reloaded_inst.status == "PAID"
    assert reloaded_inst.paid_at is not None

    reloaded_acc = db.query(Account).filter(Account.id == acc_id).first()
    assert reloaded_acc.balance == init_balance - emi_amount

    reloaded_loan = db.query(Loan).filter(Loan.id == loan.id).first()
    assert reloaded_loan.outstanding_principal < init_loan_principal

    # Verify LoanPayment row exists
    payment = db.query(LoanPayment).filter(LoanPayment.installment_id == inst_id).first()
    assert payment is not None
    assert payment.amount_paid == emi_amount
    db.close()

    # Idempotency / Double-payment test: Attempt to repay the same installment again
    res_duplicate = client.post(
        f"/api/loans/installments/{inst_id}/repay",
        headers=headers,
        json={"source_account_id": acc_id}
    )
    assert res_duplicate.status_code == 409
    assert "already paid" in res_duplicate.json()["detail"].lower()

def test_final_installment_closes_loan(tokens):
    """When the final installment of a loan is repaid, the loan status transitions to CLOSED."""
    db = SessionLocal()
    # Create a small 1-installment test loan for testing closure
    cust = db.query(Customer).first()
    acc = db.query(Account).filter(Account.customer_id == cust.id).first()
    acc.balance += Decimal("10000.0000")

    test_loan = Loan(
        loan_number=f"LN-CLOSURE-TEST-{os.urandom(3).hex().upper()}",
        customer_id=cust.id,
        branch_id=cust.branch_id,
        disbursement_account_id=acc.id,
        loan_type="PERSONAL",
        principal_amount=Decimal("1000.0000"),
        annual_interest_rate=Decimal("10.00"),
        tenure_months=1,
        monthly_emi=Decimal("1010.0000"),
        outstanding_principal=Decimal("1000.0000"),
        outstanding_interest=Decimal("10.0000"),
        status="DISBURSED"
    )
    db.add(test_loan)
    db.flush()

    from datetime import date
    single_inst = LoanInstallment(
        loan_id=test_loan.id,
        installment_number=1,
        due_date=date.today(),
        principal_component=Decimal("1000.0000"),
        interest_component=Decimal("10.0000"),
        total_amount=Decimal("1010.0000"),
        status="PENDING"
    )
    db.add(single_inst)
    db.commit()

    loan_id = test_loan.id
    inst_id = single_inst.id
    acc_id = acc.id
    db.close()

    headers = {"Authorization": f"Bearer {tokens['admin']}"}
    res = client.post(
        f"/api/loans/installments/{inst_id}/repay",
        headers=headers,
        json={"source_account_id": acc_id}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["loan_status"] == "CLOSED"

    db = SessionLocal()
    closed_loan = db.query(Loan).filter(Loan.id == loan_id).first()
    assert closed_loan.status == "CLOSED"
    db.close()
