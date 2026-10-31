import os
import sys
import uuid
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor, as_completed
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.database import SessionLocal
from backend.app.models.account import Account
from backend.app.models.transaction import Transaction, LedgerEntry
from backend.app.services.transfer_service import TransferService

def test_parallel_concurrency_20_transfers_no_deadlocks():
    """
    Fires 20 concurrent cross-transfers between Account A and Account B
    using ThreadPoolExecutor (10 threads in parallel).
    Guarantees:
    - Zero deadlocks (ordered locking MIN(id) -> MAX(id))
    - Zero negative balances
    - Conservation of total funds: initial_sum == final_sum
    - Double-entry ledger parity: sum(debit) == sum(credit)
    """
    db = SessionLocal()
    # Create two dedicated test accounts
    acc_a = Account(
        account_number=f"RACE-A-{uuid.uuid4().hex[:6]}",
        customer_id=1,
        branch_id=1,
        account_type="SAVINGS",
        balance=Decimal("10000.0000"),
        currency="INR",
        status="ACTIVE"
    )
    acc_b = Account(
        account_number=f"RACE-B-{uuid.uuid4().hex[:6]}",
        customer_id=2,
        branch_id=1,
        account_type="SAVINGS",
        balance=Decimal("10000.0000"),
        currency="INR",
        status="ACTIVE"
    )
    db.add_all([acc_a, acc_b])
    db.commit()

    id_a = acc_a.id
    id_b = acc_b.id
    init_total = acc_a.balance + acc_b.balance
    db.close()

    try:
        transfer_amount = Decimal("100.0000")
        tx_refs = []

        def perform_transfer(transfer_idx: int):
            # Even index: A -> B; Odd index: B -> A (cross-traffic designed to test deadlock prevention)
            from_id, to_id = (id_a, id_b) if transfer_idx % 2 == 0 else (id_b, id_a)
            thread_db = SessionLocal()
            try:
                tx, elapsed = TransferService.execute_transfer(
                    db=thread_db,
                    source_account_id=from_id,
                    destination_account_id=to_id,
                    amount=transfer_amount,
                    description=f"Parallel Race Test #{transfer_idx}",
                    idempotency_key=f"RACE-TX-{uuid.uuid4().hex}",
                    record_audit=False
                )
                return {"status": "SUCCESS", "ref": tx.reference_no, "idx": transfer_idx}
            except Exception as exc:
                return {"status": "FAILED", "error": str(exc), "idx": transfer_idx}
            finally:
                thread_db.close()

        # Dispatch 20 concurrent operations across 10 worker threads
        results = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(perform_transfer, i) for i in range(20)]
            for f in as_completed(futures):
                results.append(f.result())

        # Assertions
        # 1. Zero deadlocks: no MySQL Error 1213 Deadlock
        deadlock_errors = [r for r in results if "deadlock" in str(r.get("error", "")).lower()]
        assert len(deadlock_errors) == 0, f"Deadlock occurred: {deadlock_errors}"

        successful_transfers = [r for r in results if r["status"] == "SUCCESS"]
        assert len(successful_transfers) == 20, f"Expected 20 successful transfers, got {len(successful_transfers)}: {results}"

        # 2. Conservation of total balance
        verify_db = SessionLocal()
        final_a = verify_db.query(Account).filter(Account.id == id_a).first()
        final_b = verify_db.query(Account).filter(Account.id == id_b).first()
        assert final_a.balance >= Decimal("0.0000"), "Balance must never drop below 0"
        assert final_b.balance >= Decimal("0.0000"), "Balance must never drop below 0"
        assert (final_a.balance + final_b.balance) == init_total, "Conservation of value violated"

        # 3. Double-entry ledger parity for each transfer
        tx_refs = [r["ref"] for r in successful_transfers]
        for ref in tx_refs:
            tx = verify_db.query(Transaction).filter(Transaction.reference_no == ref).first()
            assert tx is not None
            entries = verify_db.query(LedgerEntry).filter(LedgerEntry.transaction_id == tx.id).all()
            assert len(entries) == 2, f"Expected exactly 2 ledger entries for {ref}"
            debits = sum(e.amount for e in entries if e.entry_type == "DEBIT")
            credits = sum(e.amount for e in entries if e.entry_type == "CREDIT")
            assert debits == credits == transfer_amount, f"Ledger debit/credit mismatch on {ref}"
        verify_db.close()

    finally:
        # Clean up test artifacts so that audit chain, ledger and tables remain pristine
        cleanup_db = SessionLocal()
        try:
            from backend.app.models.audit import AuditLog
            test_txs = cleanup_db.query(Transaction).filter(Transaction.reference_no.like("RACE-TX-%")).all()
            tx_ids = [t.id for t in test_txs]
            if tx_ids:
                cleanup_db.query(LedgerEntry).filter(LedgerEntry.transaction_id.in_(tx_ids)).delete(synchronize_session=False)
                cleanup_db.query(Transaction).filter(Transaction.id.in_(tx_ids)).delete(synchronize_session=False)
            cleanup_db.query(Account).filter(Account.id.in_([id_a, id_b])).delete(synchronize_session=False)
            cleanup_db.query(AuditLog).filter(AuditLog.action.like("Parallel Race Test%")).delete(synchronize_session=False)
            cleanup_db.commit()
        except Exception:
            cleanup_db.rollback()
        finally:
            cleanup_db.close()
