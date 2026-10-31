import time
import uuid
from decimal import Decimal
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status
from backend.app.models import Account, Transaction, LedgerEntry, OutboxEvent, User
from backend.app.core.auth import record_audit_event

class TransferService:
    @staticmethod
    def execute_transfer(
        db: Session,
        source_account_id: int,
        destination_account_id: int,
        amount: Decimal,
        description: str,
        idempotency_key: str = None,
        simulate_failure_before_commit: bool = False,
        user: User = None
    ) -> Tuple[Transaction, float]:
        """
        Executes a financial transfer with pessimistic row-level locking (SELECT ... FOR UPDATE)
        and strict double-entry ledger bookkeeping.
        """
        if amount <= Decimal("0.0000"):
            raise HTTPException(status_code=400, detail="Transfer amount must be strictly positive")

        if source_account_id == destination_account_id:
            raise HTTPException(status_code=400, detail="Source and destination accounts must be distinct")

        start_time = time.perf_counter()

        # Check idempotency key first if provided
        if idempotency_key:
            existing_tx = db.query(Transaction).filter(Transaction.idempotency_key == idempotency_key).first()
            if existing_tx:
                elapsed = (time.perf_counter() - start_time) * 1000
                return existing_tx, elapsed

        # -------------------------------------------------------------
        # PESSIMISTIC LOCKING STRATEGY: Ascending Order Lock Acquisition
        # Mathematically prevents circular deadlocks: min(A, B) then max(A, B)
        # -------------------------------------------------------------
        first_id = min(source_account_id, destination_account_id)
        second_id = max(source_account_id, destination_account_id)

        try:
            # Acquire row locks
            acc_first = db.query(Account).with_for_update().filter(Account.id == first_id).first()
            acc_second = db.query(Account).with_for_update().filter(Account.id == second_id).first()

            if not acc_first or not acc_second:
                raise HTTPException(status_code=404, detail="One or both accounts not found")

            source = acc_first if acc_first.id == source_account_id else acc_second
            destination = acc_second if acc_second.id == destination_account_id else acc_first

            # Validate account statuses
            if source.status != "ACTIVE":
                raise HTTPException(status_code=400, detail=f"Source account is {source.status} and cannot initiate transfers")

            if destination.status != "ACTIVE":
                raise HTTPException(status_code=400, detail=f"Destination account is {destination.status} and cannot receive funds")

            # Validate sufficient funds
            if source.balance < amount and not source.is_system_account:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Insufficient funds: Available balance ₹{source.balance:,.2f}, requested ₹{amount:,.2f}"
                )

            # Update account balances
            source.balance -= amount
            destination.balance += amount
            source.version += 1
            destination.version += 1

            # FAULT INJECTION SIMULATION (Rollback Demonstration)
            if simulate_failure_before_commit:
                # Intentionally trigger an error after debiting source
                raise RuntimeError("Simulated Database / Hardware Failure Injected! Triggering Transaction ROLLBACK.")

            # Create Transaction Record
            ref_no = f"TXN-{uuid.uuid4().hex[:10].upper()}"
            tx = Transaction(
                reference_no=ref_no,
                idempotency_key=idempotency_key,
                source_account_id=source.id,
                destination_account_id=destination.id,
                amount=amount,
                currency=source.currency,
                transaction_type="TRANSFER",
                status="COMPLETED",
                description=description
            )
            db.add(tx)
            db.flush()

            # Record Double-Entry Ledger Entries
            # Entry 1: DEBIT source account
            le_debit = LedgerEntry(
                transaction_id=tx.id,
                account_id=source.id,
                entry_type="DEBIT",
                amount=amount,
                balance_after=source.balance,
                posted_at=tx.created_at
            )
            # Entry 2: CREDIT destination account
            le_credit = LedgerEntry(
                transaction_id=tx.id,
                account_id=destination.id,
                entry_type="CREDIT",
                amount=amount,
                balance_after=destination.balance,
                posted_at=tx.created_at
            )
            db.add_all([le_debit, le_credit])

            # Record Transactional Outbox Event for async MongoDB/analytics projection
            outbox = OutboxEvent(
                event_id=str(uuid.uuid4()),
                event_type="FINANCIAL_TRANSFER_COMPLETED",
                aggregate_type="Transaction",
                aggregate_id=str(tx.id),
                payload={
                    "reference_no": tx.reference_no,
                    "source_account_id": source.id,
                    "source_account_number": source.account_number,
                    "destination_account_id": destination.id,
                    "destination_account_number": destination.account_number,
                    "amount": float(amount),
                    "timestamp": tx.created_at.isoformat()
                },
                status="PENDING"
            )
            db.add(outbox)

            # Record Relational Audit Log
            record_audit_event(
                db=db,
                user=user,
                action="FINANCIAL_TRANSFER",
                entity_type="Transaction",
                entity_id=str(tx.id),
                payload={
                    "ref": tx.reference_no,
                    "from": source.account_number,
                    "to": destination.account_number,
                    "amount": float(amount)
                }
            )

            # Commit the entire atomic unit of work
            db.commit()
            db.refresh(tx)
            db.refresh(source)

            elapsed_ms = (time.perf_counter() - start_time) * 1000
            return tx, elapsed_ms

        except Exception as e:
            db.rollback()
            raise e

