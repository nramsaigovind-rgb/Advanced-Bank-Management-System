import os
import sys
import pytest
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.database import SessionLocal

ALL_19_TABLES = [
    "roles",
    "permissions",
    "role_permissions",
    "users",
    "branches",
    "employees",
    "customers",
    "accounts",
    "cards",
    "beneficiaries",
    "transactions",
    "ledger_entries",
    "loans",
    "loan_installments",
    "loan_payments",
    "audit_logs",
    "outbox_events",
    "fraud_alerts",
    "notifications",
]

@pytest.mark.parametrize("table_name", ALL_19_TABLES)
def test_table_has_at_least_10_records(table_name):
    """
    Academic DBMS Laboratory Deliverable Requirement:
    Assert that all 19 normalized relational tables contain >= 10 records.
    """
    db = SessionLocal()
    try:
        query = text(f"SELECT COUNT(*) FROM `{table_name}`")
        count = db.execute(query).scalar()
        assert count is not None, f"Failed to count rows in table {table_name}"
        assert count >= 10, f"Table `{table_name}` has only {count} rows; expected at least 10"
    finally:
        db.close()
