import os
import sys
import uuid
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.core.rate_limiter import check_rate_limit
from backend.app.core.security import create_access_token

client = TestClient(app)

def test_atomic_rate_limit_counter():
    """Verify that after limit calls within the window, subsequent calls return allowed=False and retry_after."""
    key = f"rate:test:{uuid.uuid4().hex}"
    limit = 3

    # First 3 attempts should be allowed
    for _ in range(limit):
        allowed, retry_after = check_rate_limit(key, limit=limit, window_seconds=30)
        assert allowed is True
        assert retry_after == 0

    # 4th attempt should be rejected
    allowed, retry_after = check_rate_limit(key, limit=limit, window_seconds=30)
    assert allowed is False
    assert retry_after > 0

def test_login_rate_limit_429_with_retry_after():
    """Verify that making >5 login attempts for the same username triggers 429 with Retry-After header."""
    unique_user = f"ratetest_{uuid.uuid4().hex[:6]}"
    
    # 5 attempts should return 401 (invalid credentials), not 429
    for _ in range(5):
        res = client.post("/api/auth/login", json={"username": unique_user, "password": "WrongPassword123"})
        assert res.status_code == 401

    # 6th attempt should be blocked by rate limiter with 429
    res_blocked = client.post("/api/auth/login", json={"username": unique_user, "password": "WrongPassword123"})
    assert res_blocked.status_code == 429
    assert "Retry-After" in res_blocked.headers
    assert int(res_blocked.headers["Retry-After"]) > 0
    assert "Too many failed login attempts" in res_blocked.json()["detail"]

def test_rate_limiter_graceful_fallback_when_redis_down():
    """Verify that when Redis is unreachable or raises an exception, the limiter falls back gracefully."""
    with patch("backend.app.core.redis_client.cache_manager.client", None):
        allowed, retry_after = check_rate_limit("rate:fallback:test", limit=5, window_seconds=60)
        assert allowed is True
        assert retry_after == 0

    # Also test when pipeline raises an exception
    mock_client = MagicMock()
    mock_client.pipeline.side_effect = Exception("Redis connection dropped")
    with patch("backend.app.core.redis_client.cache_manager.client", mock_client):
        allowed, retry_after = check_rate_limit("rate:fallback:exception", limit=5, window_seconds=60)
        assert allowed is True
        assert retry_after == 0

def test_admin_diagnostics_rate_limit_demo():
    """Verify the rate limit demo diagnostic endpoint returns 200/429 results."""
    admin_token = create_access_token(subject=1, role="admin")
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.post("/api/admin/diagnostics/rate-limit-demo?burst_count=7", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["rate_limit_triggered"] is True
    assert len(data["results"]) == 7
    # First 5 should be 200, 6th and 7th should be 429
    assert data["results"][0]["status_code"] == 200
    assert data["results"][4]["status_code"] == 200
    assert data["results"][5]["status_code"] == 429
    assert data["results"][6]["status_code"] == 429
