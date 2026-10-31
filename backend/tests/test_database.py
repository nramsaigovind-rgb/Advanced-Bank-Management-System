import os
import sys
from decimal import Decimal
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.database import SessionLocal, engine
from backend.app.core.mongo import get_mongo_db
from backend.app.core.redis_client import cache_manager
from backend.app.core.security import verify_password, compute_audit_hash
from backend.app.models import (
    User, Customer, Employee, Branch, Account,
    Transaction, LedgerEntry, Loan, LoanInstallment,
    AuditLog, FraudAlert
)

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_database_connectivity(db: Session):
    """Test MySQL connectivity and basic query execution."""
    result = db.execute(text("SELECT 1 AS connected, CURRENT_USER(), DATABASE(), VERSION()")).fetchone()
    assert result[0] == 1
    assert "bank_management" in result[2]

def test_seeded_entities_exist(db: Session):
    """Verify all primary seed entities exist in expected quantities."""
    branches_count = db.query(Branch).count()
    users_count = db.query(User).count()
    customers_count = db.query(Customer).count()
    employees_count = db.query(Employee).count()
    accounts_count = db.query(Account).count()
    loans_count = db.query(Loan).count()
    tx_count = db.query(Transaction).count()
    ledger_count = db.query(LedgerEntry).count()

    assert branches_count >= 4, f"Expected at least 4 branches, found {branches_count}"
    assert users_count >= 10, f"Expected at least 10 users, found {users_count}"
    assert customers_count >= 8, f"Expected at least 8 customers, found {customers_count}"
    assert employees_count >= 4, f"Expected at least 4 employees, found {employees_count}"
    assert accounts_count >= 10, f"Expected at least 10 accounts, found {accounts_count}"
    assert loans_count >= 1, f"Expected at least 1 loan, found {loans_count}"
    assert tx_count >= 10, f"Expected at least 10 transactions, found {tx_count}"
    assert ledger_count >= 20, f"Expected at least 20 ledger entries, found {ledger_count}"

def test_concurrency_test_account_prepared(db: Session):
    """Alex Turner's account must exist and have valid funds for concurrency testing."""
    alex = db.query(Customer).filter_by(customer_number="CUST-20260001").first()
    assert alex is not None
    alex_savings = db.query(Account).filter_by(customer_id=alex.id, account_type="SAVINGS").first()
    assert alex_savings is not None
    assert alex_savings.balance >= Decimal("0.0000")

def test_double_entry_ledger_balancing(db: Session):
    """Every financial transaction must have equal total debits and credits."""
    transactions = db.query(Transaction).all()
    assert len(transactions) > 0

    for tx in transactions:
        entries = db.query(LedgerEntry).filter_by(transaction_id=tx.id).all()
        assert len(entries) >= 2, f"Transaction {tx.reference_no} has fewer than 2 ledger entries"
        
        debits = sum(e.amount for e in entries if e.entry_type == "DEBIT")
        credits = sum(e.amount for e in entries if e.entry_type == "CREDIT")
        assert debits == credits, f"Transaction {tx.reference_no} is unbalanced! Debits: {debits}, Credits: {credits}"
        assert debits == tx.amount, f"Transaction {tx.reference_no} entry amount {debits} != tx amount {tx.amount}"

def test_check_constraint_rejects_negative_balance(db: Session):
    """MySQL CHECK constraint chk_acc_balance must reject negative balances on non-system accounts."""
    account = db.query(Account).filter_by(is_system_account=False).first()
    assert account is not None

    with pytest.raises(Exception) as exc_info:
        db.execute(text("UPDATE accounts SET balance = -500.0000 WHERE id = :acc_id"), {"acc_id": account.id})
        db.commit()
    db.rollback()
    assert "chk_acc_balance" in str(exc_info.value).lower() or "check constraint" in str(exc_info.value).lower()

def test_check_constraint_rejects_negative_transaction_amount(db: Session):
    """MySQL CHECK constraint chk_tx_amount must reject zero or negative transaction amounts."""
    acc1 = db.query(Account).first()
    acc2 = db.query(Account).filter(Account.id != acc1.id).first()

    with pytest.raises(Exception) as exc_info:
        db.execute(
            text("""
                INSERT INTO transactions (reference_no, source_account_id, destination_account_id, amount, transaction_type, status, description)
                VALUES ('TXN-TEST-FAIL-01', :src, :dst, -100.0000, 'TRANSFER', 'PENDING', 'Invalid negative amount')
            """),
            {"src": acc1.id, "dst": acc2.id}
        )
        db.commit()
    db.rollback()
    assert "chk_tx_amount" in str(exc_info.value).lower() or "check constraint" in str(exc_info.value).lower()

def test_views_execution(db: Session):
    """Verify all 3 database views execute cleanly and return valid rows."""
    summaries = db.execute(text("SELECT * FROM v_account_summaries LIMIT 5")).fetchall()
    assert len(summaries) > 0

    kpis = db.execute(text("SELECT * FROM v_branch_financial_kpis")).fetchall()
    assert len(kpis) >= 4
    for row in kpis:
        assert row.total_customers >= 0
        assert row.active_accounts >= 0
        assert row.total_deposits >= 0

    loans_overview = db.execute(text("SELECT * FROM v_customer_loan_overview")).fetchall()
    assert len(loans_overview) >= 1

def test_stored_procedures(db: Session):
    """Verify stored procedures execute successfully."""
    # Test reconciliation procedure on an account with strict double-entry history
    acc = db.query(Account).filter(Account.customer_id == 6).first()
    assert acc is not None

    res = db.execute(text("CALL sp_reconcile_account_ledger(:acc_id)"), {"acc_id": acc.id}).fetchone()
    assert res is not None
    assert res.reconciliation_status == "BALANCED"
    assert res.balance_discrepancy == Decimal("0.0000")

    # Test branch summary procedure
    br = db.query(Branch).first()
    res2 = db.execute(text("CALL sp_branch_financial_summary(:branch_id)"), {"branch_id": br.id}).fetchone()
    assert res2 is not None
    assert res2.branch_code == br.branch_code

def test_cryptographic_audit_hash_chain(db: Session):
    """Verify that every audit log entry correctly chains its record_hash."""
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    assert len(logs) >= 5

    prev_hash = "0" * 64
    for log in logs:
        assert log.prev_hash == prev_hash, f"Hash chain broken at audit log {log.id}! Expected prev {prev_hash}, got {log.prev_hash}"
        # Recalculate hash
        expected_hash = compute_audit_hash(prev_hash, {
            "role": log.actor_role,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "payload": log.new_values,
            "ip": log.ip_address
        })
        assert log.record_hash == expected_hash, f"Hash mismatch at audit log {log.id}!"
        prev_hash = log.record_hash

def test_mongodb_fraud_graph():
    """Verify MongoDB fraud graph nodes, edges, and index configuration."""
    mongo = get_mongo_db()
    nodes_count = mongo.fraud_graph_nodes.count_documents({})
    edges_count = mongo.fraud_graph_edges.count_documents({})

    assert nodes_count >= 8, f"Expected >= 8 fraud graph nodes, got {nodes_count}"
    assert edges_count >= 8, f"Expected >= 8 fraud graph edges, got {edges_count}"

    # Verify circular transfer detection topology
    cycle_edges = list(mongo.fraud_graph_edges.find({"edge_type": "TRANSACTED_WITH"}))
    assert len(cycle_edges) >= 4

    # Verify shared device cluster
    shared_device_edges = list(mongo.fraud_graph_edges.find({"edge_type": "USED_DEVICE"}))
    assert len(shared_device_edges) >= 3

def test_redis_cache_operations():
    """Verify Redis caching operations, metrics tracking, and stats."""
    test_key = "test:bank:metric:ping"
    cache_manager.set(test_key, "PONG", ex=60)
    val = cache_manager.get(test_key)
    assert val == "PONG"

    stats = cache_manager.get_stats()
    assert stats["status"] == "connected"
    assert stats["hits"] >= 1
    assert stats["keys_count"] >= 1

