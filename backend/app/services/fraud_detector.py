import uuid
import logging
import networkx as nx
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.core.mongo import get_mongo_db
from backend.app.models.transaction import Transaction
from backend.app.models.account import Account, Beneficiary
from backend.app.models.audit import FraudAlert

logger = logging.getLogger("abms.fraud_detector")

def run_post_transfer_fraud_checks(db: Session, tx: Transaction) -> List[FraudAlert]:
    """
    Evaluates fraud detection rules on a committed transfer:
    1. Velocity: > 5 transfers in 10 minutes
    2. Amount spike: > 3x the customer's 30-day average
    3. New beneficiary + large amount: added <= 24h ago (or not in beneficiaries) and amount >= 50,000
    4. Circular flow: graph path exists from destination back to source
    Creates FraudAlert rows in MySQL with status='UNDER_INVESTIGATION' for high/critical risks.
    Never blocks the transfer.
    """
    alerts: List[FraudAlert] = []

    try:
        source_account = db.query(Account).filter(Account.id == tx.source_account_id).first()
        dest_account = db.query(Account).filter(Account.id == tx.destination_account_id).first()

        if not source_account or not dest_account:
            return []

        # -------------------------------------------------------------
        # Rule 1: Velocity (> 5 transfers in 10 min)
        # -------------------------------------------------------------
        ten_mins_ago = datetime.utcnow() - timedelta(minutes=10)
        recent_count = db.query(Transaction).filter(
            Transaction.source_account_id == tx.source_account_id,
            Transaction.created_at >= ten_mins_ago,
            Transaction.transaction_type == "TRANSFER"
        ).count()

        if recent_count > 5:
            alerts.append(FraudAlert(
                alert_code=f"FA-VEL-{uuid.uuid4().hex[:8].upper()}",
                account_id=source_account.id,
                customer_id=source_account.customer_id,
                risk_score=80,
                severity="HIGH",
                alert_type="HIGH_VELOCITY_TRANSFERS",
                description=f"Velocity anomaly: Account {source_account.account_number} dispatched {recent_count} transfers within the last 10 minutes.",
                status="UNDER_INVESTIGATION"
            ))

        # -------------------------------------------------------------
        # Rule 2: Amount > 3x 30-day average
        # -------------------------------------------------------------
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        past_amounts = db.query(Transaction.amount).filter(
            Transaction.source_account_id == tx.source_account_id,
            Transaction.created_at >= thirty_days_ago,
            Transaction.id != tx.id,
            Transaction.status == "COMPLETED"
        ).all()

        if past_amounts and len(past_amounts) >= 1:
            avg_amount = sum(a[0] for a in past_amounts) / len(past_amounts)
            if avg_amount > 0 and tx.amount > (Decimal("3.0") * avg_amount):
                alerts.append(FraudAlert(
                    alert_code=f"FA-SPK-{uuid.uuid4().hex[:8].upper()}",
                    account_id=source_account.id,
                    customer_id=source_account.customer_id,
                    risk_score=85,
                    severity="HIGH",
                    alert_type="UNUSUAL_TRANSACTION_SPIKE",
                    description=f"Transaction spike: Amount ₹{float(tx.amount):,.2f} exceeds 3x the 30-day average (₹{float(avg_amount):,.2f}) for Account {source_account.account_number}.",
                    status="UNDER_INVESTIGATION"
                ))

        # -------------------------------------------------------------
        # Rule 3: New beneficiary + large amount (>= ₹50,000)
        # -------------------------------------------------------------
        if tx.amount >= Decimal("50000.00") and source_account.customer_id:
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            ben = db.query(Beneficiary).filter(
                Beneficiary.customer_id == source_account.customer_id,
                Beneficiary.account_number == dest_account.account_number
            ).first()

            is_new_or_unregistered = (ben is None) or (ben.created_at >= twenty_four_hours_ago)
            if is_new_or_unregistered:
                alerts.append(FraudAlert(
                    alert_code=f"FA-BEN-{uuid.uuid4().hex[:8].upper()}",
                    account_id=source_account.id,
                    customer_id=source_account.customer_id,
                    risk_score=75,
                    severity="HIGH",
                    alert_type="NEW_BENEFICIARY_LARGE_TRANSFER",
                    description=f"High-value transfer of ₹{float(tx.amount):,.2f} sent to newly added (<24h) or unregistered payee Account {dest_account.account_number}.",
                    status="UNDER_INVESTIGATION"
                ))

        # -------------------------------------------------------------
        # Rule 4: Circular flow via Mongo Fraud Graph
        # -------------------------------------------------------------
        try:
            mongo = get_mongo_db()
            src_node = source_account.account_number
            dst_node = dest_account.account_number

            edges = list(mongo.fraud_graph_edges.find(
                {"edge_type": "TRANSACTED_WITH"},
                {"_id": 0, "from_node": 1, "to_node": 1}
            ))

            if edges:
                G = nx.DiGraph()
                for e in edges:
                    G.add_edge(e["from_node"], e["to_node"])

                if G.has_node(dst_node) and G.has_node(src_node):
                    if nx.has_path(G, dst_node, src_node):
                        alerts.append(FraudAlert(
                            alert_code=f"FA-CYC-{uuid.uuid4().hex[:8].upper()}",
                            account_id=source_account.id,
                            customer_id=source_account.customer_id,
                            risk_score=95,
                            severity="CRITICAL",
                            alert_type="CIRCULAR_TRANSFER_RING",
                            description=f"Circular money flow detected: Transfer from {src_node} to {dst_node} completes a closed cycle back to {src_node}.",
                            status="UNDER_INVESTIGATION"
                        ))
        except Exception as graph_err:
            logger.warning(f"Fraud graph circular check note: {graph_err}")

        # Persist alerts to MySQL
        if alerts:
            db.add_all(alerts)
            db.commit()
            logger.info(f"[!] Fraud checks triggered {len(alerts)} alerts for transaction {tx.reference_no}")

            # Notify administrators and branch managers
            try:
                from backend.app.models.user import User, Role
                from backend.app.services.notification_service import send_notification
                admin_users = (
                    db.query(User)
                    .join(Role)
                    .filter(Role.name.in_(["admin", "branch_manager"]))
                    .all()
                )
                for alert in alerts:
                    for admin in admin_users:
                        send_notification(
                            db=db,
                            user_id=admin.id,
                            title=f"Fraud Alert: {alert.severity} Risk",
                            message=alert.description[:200],
                            notification_type="FRAUD_ALERT",
                            link="/admin/fraud-alerts"
                        )
                db.commit()
            except Exception as n_err:
                logger.warning(f"Failed to emit fraud alert notification: {n_err}")

    except Exception as e:
        logger.error(f"[-] Error in post-transfer fraud evaluation: {e}")

    return alerts
