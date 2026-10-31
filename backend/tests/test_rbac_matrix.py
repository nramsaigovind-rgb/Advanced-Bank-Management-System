import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.user import User
from backend.app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def role_tokens():
    db = SessionLocal()
    admin = db.query(User).filter(User.username == "admin").first()
    manager = db.query(User).filter(User.username == "manager_br1").first()
    employee = db.query(User).filter(User.username == "emp_rahul").first()
    customer = db.query(User).filter(User.username == "alex_turner").first()

    tokens = {
        "admin": create_access_token(subject=admin.id, role=admin.role.name),
        "manager": create_access_token(subject=manager.id, role=manager.role.name),
        "employee": create_access_token(subject=employee.id, role=employee.role.name),
        "customer": create_access_token(subject=customer.id, role=customer.role.name),
    }
    db.close()
    return tokens

def test_unauthenticated_requests_return_401():
    """Endpoints requiring authentication return 401 when no token is provided."""
    endpoints = [
        ("GET", "/api/accounts"),
        ("GET", "/api/notifications"),
        ("GET", "/api/customers/me"),
        ("POST", "/api/transfers"),
        ("POST", "/api/admin/diagnostics/jobs/interest-credit"),
    ]
    for method, path in endpoints:
        res = client.request(method, path)
        assert res.status_code == 401, f"{method} {path} returned {res.status_code}, expected 401"

def test_customer_restricted_from_admin_and_staff_endpoints(role_tokens):
    """Customer role is strictly forbidden (403) from accessing administrative and staff endpoints."""
    headers = {"Authorization": f"Bearer {role_tokens['customer']}"}
    
    restricted_endpoints = [
        ("POST", "/api/admin/diagnostics/jobs/interest-credit"),
        ("POST", "/api/admin/diagnostics/jobs/mark-overdue"),
        ("POST", "/api/admin/diagnostics/rate-limit-demo"),
        ("PATCH", "/api/loans/1/approve"),
        ("POST", "/api/loans/1/disburse"),
        ("GET", "/api/reports/all-branches"),
    ]

    for method, path in restricted_endpoints:
        res = client.request(method, path, headers=headers)
        assert res.status_code == 403, f"Customer was not forbidden on {method} {path} (got {res.status_code})"

def test_employee_restricted_from_admin_diagnostics(role_tokens):
    """Employee role is forbidden (403) from accessing admin-only diagnostic tools."""
    headers = {"Authorization": f"Bearer {role_tokens['employee']}"}

    res_demo = client.post("/api/admin/diagnostics/rate-limit-demo", headers=headers)
    assert res_demo.status_code == 403

    res_job = client.post("/api/admin/diagnostics/jobs/interest-credit", headers=headers)
    assert res_job.status_code == 403

def test_manager_allowed_branch_reports_but_restricted_from_admin_jobs(role_tokens):
    """Branch Manager can access branch reports, but cannot trigger global background jobs."""
    headers = {"Authorization": f"Bearer {role_tokens['manager']}"}

    res_reports = client.get("/api/reports/all-branches", headers=headers)
    assert res_reports.status_code == 200

    res_job = client.post("/api/admin/diagnostics/jobs/interest-credit", headers=headers)
    assert res_job.status_code == 403

def test_admin_allowed_full_diagnostics(role_tokens):
    """Admin has access to diagnostics and administrative operations."""
    headers = {"Authorization": f"Bearer {role_tokens['admin']}"}

    res = client.get("/api/reports/all-branches", headers=headers)
    assert res.status_code == 200

    res_queries = client.get("/api/admin/diagnostics/queries", headers=headers)
    assert res_queries.status_code == 200

    res_notif = client.get("/api/notifications", headers=headers)
    assert res_notif.status_code == 200
