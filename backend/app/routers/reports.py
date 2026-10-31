import json
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_roles
from backend.app.core.redis_client import cache_manager
from backend.app.models import User, Branch

router = APIRouter(prefix="/api/reports", tags=["Branch Reports & Advanced SQL"])

@router.get("/all-branches")
def get_all_branches_kpis(
    use_cache: bool = Query(True),
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    cache_key = "reports:all_branches_kpis"
    if use_cache:
        cached = cache_manager.get(cache_key)
        if cached:
            return json.loads(cached)

    result = db.execute(text("SELECT * FROM v_branch_financial_kpis")).mappings().all()
    rows = [dict(r) for r in result]
    # Convert Decimals
    for r in rows:
        for k, v in r.items():
            if isinstance(v, Decimal):
                r[k] = float(v)

    if use_cache:
        cache_manager.set(cache_key, json.dumps(rows), ex=120)

    return rows

@router.get("/branch/{id}")
def get_branch_report(
    id: int,
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    branch = db.query(Branch).filter(Branch.id == id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Call Stored Procedure with CTE
    try:
        proc_res = db.execute(text("CALL sp_branch_financial_summary(:branch_id)"), {"branch_id": id}).mappings().fetchone()
        data = dict(proc_res) if proc_res else {}
        for k, v in data.items():
            if isinstance(v, Decimal):
                data[k] = float(v)
        return data
    except Exception as e:
        # Fallback to direct query if procedure result fetch requires cursor advancement
        fallback = db.execute(text("SELECT * FROM v_branch_financial_kpis WHERE branch_id = :id"), {"id": id}).mappings().fetchone()
        return dict(fallback) if fallback else {}

@router.get("/reconcile/{account_id}")
def reconcile_account_ledger(
    account_id: int,
    current_user: User = Depends(require_roles("admin", "branch_manager", "employee")),
    db: Session = Depends(get_db)
):
    """
    Executes Stored Procedure sp_reconcile_account_ledger to perform mathematical
    verification between account balance and ledger entries.
    """
    try:
        res = db.execute(text("CALL sp_reconcile_account_ledger(:acc_id)"), {"acc_id": account_id}).mappings().fetchone()
        if not res:
            raise HTTPException(status_code=404, detail="Account ledger empty or not found")
        data = dict(res)
        for k, v in data.items():
            if isinstance(v, Decimal):
                data[k] = float(v)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-customers")
def get_top_customers_by_volume(
    limit: int = 5,
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    """
    Demonstrates Advanced SQL with CTE and Aggregate Windows:
    Ranks customers by total transaction volume across all their accounts.
    """
    sql = text("""
        WITH CustomerVolume AS (
            SELECT 
                c.id AS customer_id,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.customer_number,
                b.name AS branch_name,
                COUNT(t.id) AS transaction_count,
                COALESCE(SUM(t.amount), 0) AS total_volume
            FROM customers c
            JOIN branches b ON c.branch_id = b.id
            JOIN accounts a ON a.customer_id = c.id
            JOIN transactions t ON (t.source_account_id = a.id OR t.destination_account_id = a.id)
            WHERE t.status = 'COMPLETED'
            GROUP BY c.id, c.first_name, c.last_name, c.customer_number, b.name
        )
        SELECT 
            customer_id, customer_name, customer_number, branch_name,
            transaction_count, total_volume,
            DENSE_RANK() OVER (ORDER BY total_volume DESC) AS volume_rank
        FROM CustomerVolume
        ORDER BY total_volume DESC
        LIMIT :lim;
    """)
    rows = db.execute(sql, {"lim": limit}).mappings().all()
    out = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("total_volume"), Decimal):
            d["total_volume"] = float(d["total_volume"])
        out.append(d)
    return out

