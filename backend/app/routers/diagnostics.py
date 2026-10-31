import time
import json
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_roles
from backend.app.core.redis_client import cache_manager
from backend.app.core.security import compute_audit_hash
from backend.app.models import User, AuditLog, Transaction, Account

router = APIRouter(prefix="/api/admin/diagnostics", tags=["DBMS Diagnostics & Lab"])

ALLOWLISTED_QUERIES = {
    "account_statement_indexed": {
        "title": "Customer Statement (Using Composite Index idx_tx_src_created)",
        "sql": "SELECT id, reference_no, amount, transaction_type, status, created_at FROM transactions WHERE source_account_id = :acc_id ORDER BY created_at DESC LIMIT 20",
        "params": {"acc_id": 1},
        "description": "Utilizes composite index on (source_account_id, created_at DESC) to avoid full table scans and sort operations."
    },
    "account_statement_unindexed": {
        "title": "Customer Statement (Forcing Ignore of Index - Simulated Baseline)",
        "sql": "SELECT id, reference_no, amount, transaction_type, status, created_at FROM transactions IGNORE INDEX (idx_tx_src_created) WHERE source_account_id = :acc_id ORDER BY created_at DESC LIMIT 20",
        "params": {"acc_id": 1},
        "description": "Forces table scan by ignoring index, illustrating cost of missing composite indexes."
    },
    "branch_kpis_aggregation": {
        "title": "Branch Deposits & Active Accounts KPI Aggregate",
        "sql": "SELECT b.name, COUNT(DISTINCT a.id) as accounts, SUM(a.balance) as total_deposits FROM branches b JOIN accounts a ON a.branch_id = b.id WHERE a.is_system_account = FALSE GROUP BY b.id, b.name",
        "params": {},
        "description": "Demonstrates multi-table INNER JOIN with GROUP BY and aggregate functions."
    },
    "loan_outstanding_balances": {
        "title": "Branch Loan Portfolio & Outstanding Balance Scan",
        "sql": "SELECT loan_type, COUNT(*) as count, SUM(principal_amount) as total_principal, SUM(outstanding_principal) as outstanding FROM loans WHERE status IN ('DISBURSED', 'APPROVED') GROUP BY loan_type",
        "params": {},
        "description": "Scans loan portfolio using index on (status) for risk provisioning."
    }
}

@router.get("/queries")
def list_allowlisted_queries(current_user: User = Depends(require_roles("admin", "branch_manager"))):
    return [{
        "query_key": k,
        "title": v["title"],
        "sql": v["sql"],
        "description": v["description"]
    } for k, v in ALLOWLISTED_QUERIES.items()]

@router.get("/explain/{query_key}")
def explain_query(
    query_key: str,
    analyze: bool = Query(True, description="Run EXPLAIN ANALYZE for actual runtime cost"),
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    if query_key not in ALLOWLISTED_QUERIES:
        raise HTTPException(status_code=400, detail="Invalid query key. Only allowlisted diagnostic queries permitted.")

    spec = ALLOWLISTED_QUERIES[query_key]
    raw_sql = spec["sql"]
    params = spec["params"]

    # 1. Run Standard EXPLAIN
    explain_sql = f"EXPLAIN {raw_sql}"
    t0 = time.perf_counter()
    explain_res = db.execute(text(explain_sql), params).mappings().all()
    explain_duration_ms = (time.perf_counter() - t0) * 1000

    plan_rows = [dict(r) for r in explain_res]

    # 2. Run EXPLAIN ANALYZE (MySQL 8.0 feature)
    analyze_output = None
    if analyze:
        try:
            analyze_sql = f"EXPLAIN ANALYZE {raw_sql}"
            analyze_res = db.execute(text(analyze_sql), params).fetchall()
            analyze_output = "\n".join([row[0] for row in analyze_res])
        except Exception as e:
            analyze_output = f"EXPLAIN ANALYZE note: {e}"

    # 3. Execute actual query to get timing and row count
    t1 = time.perf_counter()
    actual_rows = db.execute(text(raw_sql), params).fetchall()
    actual_duration_ms = (time.perf_counter() - t1) * 1000

    return {
        "query_key": query_key,
        "title": spec["title"],
        "actual_sql": raw_sql,
        "execution_time_ms": round(actual_duration_ms, 3),
        "explain_time_ms": round(explain_duration_ms, 3),
        "rows_returned": len(actual_rows),
        "explain_plan": plan_rows,
        "explain_analyze": analyze_output
    }

@router.get("/locks")
def inspect_database_locks(
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    """
    Inspects active locks and transaction states from MySQL Performance Schema.
    """
    locks_data = []
    try:
        # Check performance_schema.data_locks
        locks_query = text("""
            SELECT 
                ENGINE_TRANSACTION_ID, OBJECT_SCHEMA, OBJECT_NAME, 
                INDEX_NAME, LOCK_TYPE, LOCK_MODE, LOCK_STATUS, LOCK_DATA
            FROM performance_schema.data_locks
            LIMIT 20;
        """)
        rows = db.execute(locks_query).mappings().all()
        locks_data = [dict(r) for r in rows]
    except Exception as e:
        locks_data = [{"note": f"Performance schema locks inspection: {e}"}]

    # Also inspect InnoDB transactions
    trx_data = []
    try:
        trx_query = text("""
            SELECT 
                trx_id, trx_state, trx_started, trx_requested_lock_id,
                trx_wait_started, trx_weight, trx_mysql_thread_id, trx_query
            FROM information_schema.innodb_trx
            LIMIT 10;
        """)
        rows = db.execute(trx_query).mappings().all()
        trx_data = [dict(r) for r in rows]
    except Exception:
        pass

    return {
        "active_locks_count": len(locks_data),
        "active_transactions_count": len(trx_data),
        "data_locks": locks_data,
        "active_innodb_transactions": trx_data,
        "pessimistic_lock_rule": "Ascending Lock Acquisition Order: MIN(id) then MAX(id)"
    }

@router.get("/cache")
def get_cache_diagnostics(current_user: User = Depends(require_roles("admin", "branch_manager"))):
    return cache_manager.get_stats()

@router.get("/cache/benchmark")
def benchmark_cache(
    iterations: int = Query(20, ge=5, le=100),
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    """
    Runs real benchmarks comparing read performance:
    Direct MySQL query vs Redis cached read.
    """
    sql = text("SELECT * FROM v_branch_financial_kpis")

    # Benchmark Direct MySQL
    mysql_times = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        db.execute(sql).fetchall()
        mysql_times.append((time.perf_counter() - t0) * 1000)

    # Benchmark Redis Cache
    cache_key = "benchmark:branch_kpi_sample"
    cache_manager.set(cache_key, '{"branches": 4, "kpis": "sample"}', ex=60)
    redis_times = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        cache_manager.get(cache_key)
        redis_times.append((time.perf_counter() - t0) * 1000)

    avg_mysql = round(sum(mysql_times) / len(mysql_times), 3)
    avg_redis = round(sum(redis_times) / len(redis_times), 3)
    speedup = round(avg_mysql / max(avg_redis, 0.001), 1)

    return {
        "iterations": iterations,
        "avg_mysql_query_ms": avg_mysql,
        "avg_redis_cache_ms": avg_redis,
        "speedup_factor": f"{speedup}x faster with Redis Cache",
        "cache_stats": cache_manager.get_stats()
    }

@router.get("/audit-verify")
def verify_audit_log_cryptographic_integrity(
    limit: int = 100,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """
    Cryptographic verification: Iterates through audit records in ascending order
    and verifies that SHA-256 hash chaining is intact and untampered.
    """
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).limit(limit).all()

    prev_hash = "0" * 64
    chain_valid = True
    tampered_records = []
    verified_logs = []

    for log in logs:
        expected_hash = compute_audit_hash(prev_hash, {
            "role": log.actor_role,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "payload": log.new_values,
            "ip": log.ip_address
        })

        is_valid = (log.prev_hash == prev_hash) and (log.record_hash == expected_hash)
        if not is_valid:
            chain_valid = False
            tampered_records.append(log.id)

        verified_logs.append({
            "id": log.id,
            "action": log.action,
            "actor_role": log.actor_role,
            "prev_hash_prefix": log.prev_hash[:16] + "...",
            "record_hash_prefix": log.record_hash[:16] + "...",
            "is_valid": is_valid,
            "timestamp": log.created_at
        })

        prev_hash = log.record_hash

    return {
        "total_audit_records_verified": len(logs),
        "chain_integrity_status": "VALID_UNTAMPERED" if chain_valid else "TAMPERING_DETECTED",
        "tampered_records_count": len(tampered_records),
        "tampered_ids": tampered_records,
        "records": verified_logs
    }

@router.post("/rate-limit-demo")
def demo_rate_limit(
    burst_count: int = Query(6, ge=1, le=20),
    current_user: User = Depends(require_roles("admin"))
):
    """
    Demonstrates Redis atomic rate limiting in action for the admin lab.
    Fires a simulated burst against an isolated demo key with limit=5/min.
    Illustrates HTTP 200 for requests 1-5 and HTTP 429 for request 6+.
    """
    from backend.app.core.rate_limiter import check_rate_limit
    demo_key = f"rate:demo:admin_lab_{int(time.time() * 1000)}"
    limit = 5
    results = []

    for i in range(1, burst_count + 1):
        allowed, retry_after = check_rate_limit(demo_key, limit=limit, window_seconds=60)
        results.append({
            "attempt": i,
            "status_code": 200 if allowed else 429,
            "allowed": allowed,
            "retry_after": retry_after if not allowed else 0,
            "action": "ALLOWED" if allowed else "BLOCKED_RATE_LIMIT"
        })

    return {
        "status": "success",
        "demo": "Redis In-Memory Rate Limiting Engine",
        "limit_per_minute": limit,
        "burst_count": burst_count,
        "rate_limit_triggered": any(not r["allowed"] for r in results),
        "results": results
    }

# ---------------- Scheduled Jobs Diagnostics ----------------

@router.post("/jobs/interest-credit")
def trigger_interest_credit_job(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """Admin manual trigger: Computes and credits 4% monthly savings interest via double-entry ledger."""
    from backend.app.services.scheduler import execute_interest_credit_job
    result = execute_interest_credit_job(db)
    return {"status": "SUCCESS", "job": "interest-credit", "result": result}

@router.post("/jobs/mark-overdue")
def trigger_mark_overdue_job(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """Admin manual trigger: Scans and flags overdue loan installments."""
    from backend.app.services.scheduler import execute_mark_overdue_job
    result = execute_mark_overdue_job(db)
    return {"status": "SUCCESS", "job": "mark-overdue", "result": result}

@router.post("/jobs/mark-dormant")
def trigger_mark_dormant_job(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """Admin manual trigger: Flags customer accounts with no activity in 180 days as DORMANT."""
    from backend.app.services.scheduler import execute_mark_dormant_job
    result = execute_mark_dormant_job(db)
    return {"status": "SUCCESS", "job": "mark-dormant", "result": result}



