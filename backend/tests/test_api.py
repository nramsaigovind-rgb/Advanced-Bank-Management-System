import os
import sys
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models import Account, Customer

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_token():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def alex_token():
    res = client.post("/api/auth/login", json={"username": "alex_turner", "password": "Customer@123"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def sarah_token():
    res = client.post("/api/auth/login", json={"username": "sarah_connor", "password": "Customer@123"})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_login_invalid_password():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword"})
    assert res.status_code == 401

def test_get_my_profile(alex_token):
    headers = {"Authorization": f"Bearer {alex_token}"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "alex_turner"
    assert data["role"] == "customer"
    assert "customer" in data

def test_customer_view_own_accounts(alex_token):
    headers = {"Authorization": f"Bearer {alex_token}"}
    res = client.get("/api/accounts", headers=headers)
    assert res.status_code == 200
    accounts = res.json()
    assert len(accounts) >= 1
    for a in accounts:
        assert a["currency"] == "INR"

def test_customer_forbidden_from_other_accounts(alex_token):
    db = SessionLocal()
    sarah = db.query(Customer).filter_by(customer_number="CUST-20260002").first()
    sarah_acc = db.query(Account).filter_by(customer_id=sarah.id).first()
    db.close()

    headers = {"Authorization": f"Bearer {alex_token}"}
    res = client.get(f"/api/accounts/{sarah_acc.id}", headers=headers)
    assert res.status_code == 403

def test_successful_transfer(sarah_token):
    db = SessionLocal()
    sarah_acc = db.query(Account).filter(Account.customer_id == 2).first()
    alex_acc = db.query(Account).filter(Account.customer_id == 1, Account.account_type == "CHECKING").first()
    db.close()

    headers = {"Authorization": f"Bearer {sarah_token}"}
    res = client.post("/api/transfers", headers=headers, json={
        "source_account_id": sarah_acc.id,
        "destination_account_number": alex_acc.account_number,
        "amount": 250.0,
        "description": "API Integration Test Split"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["ledger_entries_count"] == 2
    assert "TXN-" in data["reference_no"]

def test_transfer_insufficient_funds(alex_token):
    db = SessionLocal()
    alex_acc = db.query(Account).filter(Account.customer_id == 1).first()
    sarah_acc = db.query(Account).filter(Account.customer_id == 2).first()
    db.close()

    headers = {"Authorization": f"Bearer {alex_token}"}
    # Request transfer larger than Alex's balance
    res = client.post("/api/transfers", headers=headers, json={
        "source_account_id": alex_acc.id,
        "destination_account_number": sarah_acc.account_number,
        "amount": 99999999.0,
        "description": "Impossible overdraft transfer"
    })
    assert res.status_code == 422
    assert "insufficient funds" in res.json()["detail"].lower()

def test_rollback_demonstration(admin_token):
    db = SessionLocal()
    sarah_acc = db.query(Account).filter_by(customer_id=2).first()
    alex_acc = db.query(Account).filter_by(customer_id=1, account_type="SAVINGS").first()
    db.close()

    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.post(
        f"/api/transfers/simulate-failure?source_account_id={sarah_acc.id}&destination_account_number={alex_acc.account_number}&amount=500.0",
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ROLLED_BACK_SUCCESSFULLY"
    assert data["initial_source_balance"] == data["final_source_balance"]
    assert data["initial_destination_balance"] == data["final_destination_balance"]
    assert len(data["timeline"]) >= 6

def test_concurrency_race_condition_test(admin_token):
    db = SessionLocal()
    alex_acc = db.query(Account).filter_by(customer_id=1, account_type="SAVINGS").first()
    sarah_acc = db.query(Account).filter_by(customer_id=2).first()
    alex_id = alex_acc.id
    sarah_acc_num = sarah_acc.account_number
    # Ensure starting balance is at least 5000
    alex_acc.balance = Decimal("5000.0000")
    db.commit()
    db.close()

    headers = {"Authorization": f"Bearer {admin_token}"}
    # Concurrently attempt ₹4,000 and ₹3,000
    res = client.post(
        f"/api/transfers/concurrency-race?source_account_id={alex_id}&destination_account_number={sarah_acc_num}&amount_1=4000.00&amount_2=3000.00",
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_requests"] == 2
    assert data["balance_never_negative"] is True
    # Exactly one request must succeed and one must be rejected!
    assert data["successful_requests"] == 1
    assert data["rejected_requests"] == 1

def test_diagnostics_explain_query(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/admin/diagnostics/explain/account_statement_indexed", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "explain_plan" in data
    assert len(data["explain_plan"]) > 0

def test_diagnostics_cache_stats(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/admin/diagnostics/cache", headers=headers)
    assert res.status_code == 200
    assert "hit_ratio_percent" in res.json()

def test_diagnostics_audit_integrity(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/admin/diagnostics/audit-verify", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["chain_integrity_status"] == "VALID_UNTAMPERED"
    assert data["tampered_records_count"] == 0

def test_fraud_cycle_detection(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.post("/api/fraud/detect-cycles", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["circular_patterns_found"] >= 1
