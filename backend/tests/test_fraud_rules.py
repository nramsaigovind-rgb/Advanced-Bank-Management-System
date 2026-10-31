import os
import sys
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.core.database import SessionLocal
from backend.app.models.transaction import Transaction
from backend.app.models.account import Account, Beneficiary
from backend.app.models.audit import FraudAlert
from backend.app.services.fraud_detector import run_post_transfer_fraud_checks

def test_fraud_rule_high_velocity():
    """Rule 1: More than 5 transfers within 10 minutes triggers HIGH_VELOCITY_TRANSFERS alert."""
    db = SessionLocal()
    tx_list = []
    try:
        src_acc = db.query(Account).filter(Account.customer_id.isnot(None)).first()
        dst_acc = db.query(Account).filter(Account.id != src_acc.id).first()

        now = datetime.utcnow()
        for i in range(6):
            tx = Transaction(
                reference_no=f"TXN-VEL-{uuid.uuid4().hex[:8]}",
                source_account_id=src_acc.id,
                destination_account_id=dst_acc.id,
                amount=Decimal("100.0000"),
                currency="INR",
                transaction_type="TRANSFER",
                status="COMPLETED",
                description=f"Velocity test {i}",
                created_at=now - timedelta(minutes=i)
            )
            db.add(tx)
            tx_list.append(tx)
        db.commit()

        latest_tx = tx_list[0]
        alerts = run_post_transfer_fraud_checks(db, latest_tx)

        vel_alerts = [a for a in alerts if a.alert_type == "HIGH_VELOCITY_TRANSFERS"]
        assert len(vel_alerts) >= 1
        assert vel_alerts[0].severity == "HIGH"
        assert vel_alerts[0].status == "UNDER_INVESTIGATION"
    finally:
        for t in tx_list:
            db.delete(t)
        db.commit()
        db.close()

def test_fraud_rule_amount_spike():
    """Rule 2: Transfer > 3x the 30-day average amount triggers UNUSUAL_TRANSACTION_SPIKE."""
    db = SessionLocal()
    src_acc = None
    try:
        src_acc = Account(
            account_number=f"SPIKE-TEST-{uuid.uuid4().hex[:6]}",
            customer_id=1,
            branch_id=1,
            account_type="SAVINGS",
            balance=Decimal("100000.0000"),
            currency="INR",
            status="ACTIVE"
        )
        dst_acc = db.query(Account).filter(Account.id != 1).first()
        db.add(src_acc)
        db.flush()

        for i in range(3):
            past_tx = Transaction(
                reference_no=f"TXN-BASE-{uuid.uuid4().hex[:8]}",
                source_account_id=src_acc.id,
                destination_account_id=dst_acc.id,
                amount=Decimal("1000.0000"),
                currency="INR",
                transaction_type="TRANSFER",
                status="COMPLETED",
                description="Baseline transfer",
                created_at=datetime.utcnow() - timedelta(days=2)
            )
            db.add(past_tx)
        db.commit()

        spike_tx = Transaction(
            reference_no=f"TXN-SPIKE-{uuid.uuid4().hex[:8]}",
            source_account_id=src_acc.id,
            destination_account_id=dst_acc.id,
            amount=Decimal("10000.0000"),
            currency="INR",
            transaction_type="TRANSFER",
            status="COMPLETED",
            description="Spike transfer",
            created_at=datetime.utcnow()
        )
        db.add(spike_tx)
        db.commit()

        alerts = run_post_transfer_fraud_checks(db, spike_tx)

        spike_alerts = [a for a in alerts if a.alert_type == "UNUSUAL_TRANSACTION_SPIKE"]
        assert len(spike_alerts) >= 1
        assert spike_alerts[0].risk_score == 85
    finally:
        db.query(Transaction).filter(Transaction.reference_no.like("TXN-BASE-%")).delete(synchronize_session=False)
        db.query(Transaction).filter(Transaction.reference_no.like("TXN-SPIKE-%")).delete(synchronize_session=False)
        if src_acc and src_acc.id:
            db.query(Account).filter(Account.id == src_acc.id).delete(synchronize_session=False)
        db.commit()
        db.close()

def test_fraud_rule_new_beneficiary_large_amount():
    """Rule 3: Amount >= 50,000 sent to newly registered or unregistered beneficiary triggers alert."""
    db = SessionLocal()
    try:
        src_acc = db.query(Account).filter(Account.customer_id.isnot(None)).first()
        dst_acc = db.query(Account).filter(
            Account.id != src_acc.id,
            Account.customer_id.isnot(None)
        ).first()

        large_tx = Transaction(
            reference_no=f"TXN-NEWBEN-{uuid.uuid4().hex[:8]}",
            source_account_id=src_acc.id,
            destination_account_id=dst_acc.id,
            amount=Decimal("75000.0000"),
            currency="INR",
            transaction_type="TRANSFER",
            status="COMPLETED",
            description="Large payment to new payee",
            created_at=datetime.utcnow()
        )
        db.add(large_tx)
        db.commit()

        alerts = run_post_transfer_fraud_checks(db, large_tx)

        newben_alerts = [a for a in alerts if a.alert_type == "NEW_BENEFICIARY_LARGE_TRANSFER"]
        assert len(newben_alerts) >= 1
        assert newben_alerts[0].severity == "HIGH"
    finally:
        db.query(Transaction).filter(Transaction.reference_no.like("TXN-NEWBEN-%")).delete(synchronize_session=False)
        db.commit()
        db.close()

def test_fraud_rule_circular_transfer_cycle():
    """Rule 4: Circular flow detected when destination has path back to source in MongoDB fraud graph."""
    db = SessionLocal()
    try:
        src_acc = db.query(Account).filter(Account.id == 7).first() or db.query(Account).first()
        dst_acc = db.query(Account).filter(Account.id == 8).first() or db.query(Account).filter(Account.id != src_acc.id).first()

        cycle_tx = Transaction(
            reference_no=f"TXN-CYCLE-{uuid.uuid4().hex[:8]}",
            source_account_id=src_acc.id,
            destination_account_id=dst_acc.id,
            amount=Decimal("5000.0000"),
            currency="INR",
            transaction_type="TRANSFER",
            status="COMPLETED",
            description="Circular test transfer",
            created_at=datetime.utcnow()
        )
        db.add(cycle_tx)
        db.commit()

        mock_mongo = MagicMock()
        mock_mongo.fraud_graph_edges.find.return_value = [
            {"from_node": dst_acc.account_number, "to_node": src_acc.account_number, "edge_type": "TRANSACTED_WITH"}
        ]

        with patch("backend.app.services.fraud_detector.get_mongo_db", return_value=mock_mongo):
            alerts = run_post_transfer_fraud_checks(db, cycle_tx)

        cycle_alerts = [a for a in alerts if a.alert_type == "CIRCULAR_TRANSFER_RING"]
        assert len(cycle_alerts) >= 1
        assert cycle_alerts[0].severity == "CRITICAL"
        assert cycle_alerts[0].risk_score == 95
    finally:
        db.query(Transaction).filter(Transaction.reference_no.like("TXN-CYCLE-%")).delete(synchronize_session=False)
        db.commit()
        db.close()
