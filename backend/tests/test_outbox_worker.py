import os
import sys
import uuid
import pytest
from unittest.mock import MagicMock
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.database import SessionLocal
from backend.app.models.transaction import OutboxEvent
from backend.app.services.outbox_worker import process_outbox_batch

def test_outbox_worker_processes_pending_event():
    """Verify that a PENDING outbox event is processed and marked PROCESSED."""
    db = SessionLocal()
    # Drain any pre-existing pending events first
    process_outbox_batch(db, batch_size=100)

    evt_id = f"TEST-EVT-{uuid.uuid4().hex[:12]}"
    test_evt = OutboxEvent(
        event_id=evt_id,
        event_type="FINANCIAL_TRANSFER_COMPLETED",
        aggregate_type="Transaction",
        aggregate_id=f"TXN-{uuid.uuid4().hex[:8]}",
        payload={
            "source_account_number": "1000202600",
            "destination_account_number": "1000202601",
            "amount": 100.0,
            "reference_no": f"REF-{uuid.uuid4().hex[:6]}"
        },
        status="PENDING",
        retry_count=0
    )
    db.add(test_evt)
    db.commit()

    count = process_outbox_batch(db, batch_size=50)
    assert count >= 1

    # Reload event
    evt = db.query(OutboxEvent).filter(OutboxEvent.event_id == evt_id).first()
    assert evt is not None
    assert evt.status == "PROCESSED"
    assert evt.processed_at is not None
    assert evt.retry_count == 0
    db.close()

def test_outbox_worker_retry_increment_on_error():
    """Verify that if an error occurs during projection, retry_count is incremented."""
    db = SessionLocal()
    evt_id = f"TEST-FAIL-EVT-{uuid.uuid4().hex[:12]}"
    fail_evt = OutboxEvent(
        event_id=evt_id,
        event_type="FINANCIAL_TRANSFER_COMPLETED",
        aggregate_type="Transaction",
        aggregate_id=f"TXN-{uuid.uuid4().hex[:8]}",
        payload={
            "source_account_number": "1000202600",
            "destination_account_number": "1000202601",
            "amount": 50.0
        },
        status="PENDING",
        retry_count=2
    )
    db.add(fail_evt)
    db.commit()

    # Pass a failing mock mongo
    failing_mongo = MagicMock()
    failing_mongo.fraud_graph_nodes.update_one.side_effect = Exception("Simulated Mongo Timeout")

    process_outbox_batch(db, batch_size=50, mongo_override=failing_mongo)

    reloaded = db.query(OutboxEvent).filter(OutboxEvent.event_id == evt_id).first()
    assert reloaded.status == "PENDING"
    assert reloaded.retry_count == 3
    db.close()

def test_outbox_worker_marks_failed_after_5_retries():
    """Verify that when retry_count reaches 5, the event is marked FAILED."""
    db = SessionLocal()
    evt_id = f"TEST-PERM-FAIL-{uuid.uuid4().hex[:12]}"
    fail_evt = OutboxEvent(
        event_id=evt_id,
        event_type="FINANCIAL_TRANSFER_COMPLETED",
        aggregate_type="Transaction",
        aggregate_id=f"TXN-{uuid.uuid4().hex[:8]}",
        payload={"amount": 25.0},
        status="PENDING",
        retry_count=4  # 4th retry -> next one should hit 5 and mark FAILED
    )
    db.add(fail_evt)
    db.commit()

    failing_mongo = MagicMock()
    failing_mongo.fraud_graph_nodes.update_one.side_effect = Exception("Permanent Mongo Connection Refused")

    process_outbox_batch(db, batch_size=50, mongo_override=failing_mongo)

    reloaded = db.query(OutboxEvent).filter(OutboxEvent.event_id == evt_id).first()
    assert reloaded.retry_count == 5
    assert reloaded.status == "FAILED"
    db.close()
