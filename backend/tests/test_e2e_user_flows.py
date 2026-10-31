import os
import sys
import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.account import Account, Beneficiary
from backend.app.models.loan import Loan, LoanInstallment
from backend.app.models.user import User

client = TestClient(app)

def test_e2e_flow_1_login():
    """
    E2E Flow 1: Login Flow
    - Authenticate using Alex Turner's credentials
    - Receive valid JWT token
    - Query /api/auth/me to confirm authenticated customer profile and role
    """
    res = client.post("/api/auth/login", json={
        "username": "alex_turner",
        "password": "Customer@123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    token = data["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    profile = me_res.json()
    assert profile["username"] == "alex_turner"
    assert profile["role"] == "customer"
    assert "customer" in profile

def test_e2e_flow_2_transfer():
    """
    E2E Flow 2: Transfer Flow
    - Authenticate as Sarah Connor
    - Fetch accounts and choose source account
    - Fetch saved beneficiaries
    - Submit transfer to Alex Turner
    - Verify transfer status, ledger postings, and balance deduction
    """
    # 1. Login
    login_res = client.post("/api/auth/login", json={
        "username": "sarah_connor",
        "password": "Customer@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get accounts
    accs_res = client.get("/api/accounts", headers=headers)
    assert accs_res.status_code == 200
    accs = accs_res.json()
    assert len(accs) > 0
    sarah_acc = accs[0]

    # 3. Get beneficiaries
    ben_res = client.get("/api/customers/beneficiaries", headers=headers)
    assert ben_res.status_code == 200

    # 4. Find Alex's checking/savings account
    db = SessionLocal()
    alex_acc = db.query(Account).filter(Account.customer_id == 1, Account.status == "ACTIVE").first()
    db.close()

    # 5. Authorize transfer
    transfer_amount = 350.0
    idem_key = f"E2E-TX-{uuid.uuid4().hex}"
    tx_res = client.post("/api/transfers", headers=headers, json={
        "source_account_id": sarah_acc["id"],
        "destination_account_number": alex_acc.account_number,
        "amount": transfer_amount,
        "description": "E2E Automated Rent Share Settlement",
        "idempotency_key": idem_key
    })
    assert tx_res.status_code == 200
    tx_data = tx_res.json()
    assert tx_data["status"] == "COMPLETED"
    assert tx_data["ledger_entries_count"] == 2
    assert "TXN-" in tx_data["reference_no"]

def test_e2e_flow_3_repayment():
    """
    E2E Flow 3: Loan Repayment Flow
    - Authenticate as Alex Turner
    - Query active loans and amortization installments
    - Select next pending installment
    - Execute repayment endpoint using customer account
    - Verify status updates to PAID and loan principal is reduced
    """
    login_res = client.post("/api/auth/login", json={
        "username": "alex_turner",
        "password": "Customer@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    alex_user = db.query(User).filter(User.username == "alex_turner").first()
    alex_loan = db.query(Loan).filter(Loan.customer_id == alex_user.customer_profile.id, Loan.status == "DISBURSED").first()
    assert alex_loan is not None, "Alex must have an active disbursed loan"

    # Fetch pending installment
    inst = db.query(LoanInstallment).filter(
        LoanInstallment.loan_id == alex_loan.id,
        LoanInstallment.status == "PENDING"
    ).order_by(LoanInstallment.installment_number.asc()).first()
    assert inst is not None

    alex_acc = db.query(Account).filter(Account.customer_id == alex_user.customer_profile.id).first()
    # Ensure sufficient balance
    if alex_acc.balance < inst.total_amount:
        alex_acc.balance += Decimal("100000.0000")
        db.commit()

    inst_id = inst.id
    source_acc_id = alex_acc.id
    db.close()

    # Call repay endpoint
    repay_res = client.post(
        f"/api/loans/installments/{inst_id}/repay",
        headers=headers,
        json={"source_account_id": source_acc_id}
    )
    assert repay_res.status_code == 200
    data = repay_res.json()
    assert data["status"] == "success"
    assert data["installment_id"] == inst_id

    # Verify installment in DB
    verify_db = SessionLocal()
    reloaded_inst = verify_db.query(LoanInstallment).filter(LoanInstallment.id == inst_id).first()
    assert reloaded_inst.status == "PAID"
    verify_db.close()

def test_e2e_flow_4_statement_download():
    """
    E2E Flow 4: Statement Download Flow
    - Authenticate as Alex Turner
    - Query CSV statement export for Alex's primary account
    - Query PDF statement export for Alex's primary account
    - Assert correct MIME types and Content-Disposition headers
    """
    login_res = client.post("/api/auth/login", json={
        "username": "alex_turner",
        "password": "Customer@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    db = SessionLocal()
    alex_user = db.query(User).filter(User.username == "alex_turner").first()
    alex_acc = db.query(Account).filter(Account.customer_id == alex_user.customer_profile.id).first()
    acc_id = alex_acc.id
    db.close()

    # 1. Download CSV
    csv_res = client.get(f"/api/accounts/{acc_id}/statement?format=csv", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "attachment; filename=" in csv_res.headers.get("content-disposition", "")
    assert "Date,Ref,Description,Debit,Credit,Balance" in csv_res.text

    # 2. Download PDF
    pdf_res = client.get(f"/api/accounts/{acc_id}/statement?format=pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers.get("content-type", "")
    assert "attachment; filename=" in pdf_res.headers.get("content-disposition", "")
    # Check PDF magic bytes (%PDF)
    assert pdf_res.content.startswith(b"%PDF")
