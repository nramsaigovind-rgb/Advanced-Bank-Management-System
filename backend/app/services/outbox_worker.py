import asyncio
import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal
from backend.app.core.mongo import get_mongo_db
from backend.app.models.transaction import OutboxEvent

logger = logging.getLogger("abms.outbox_worker")

def process_outbox_batch(db: Session, batch_size: int = 50, mongo_override=None) -> int:
    """
    Polls outbox_events WHERE status='PENDING' ORDER BY id LIMIT batch_size
    using SELECT ... FOR UPDATE SKIP LOCKED.
    Projects each event into MongoDB fraud graph, updates status to PROCESSED.
    On error, increments retry_count; marks FAILED after 5 retries.
    Returns the count of successfully processed events.
    """
    events = (
        db.query(OutboxEvent)
        .filter(OutboxEvent.status == "PENDING")
        .order_by(OutboxEvent.id.asc())
        .limit(batch_size)
        .with_for_update(skip_locked=True)
        .all()
    )

    if not events:
        return 0

    processed_count = 0
    mongo = mongo_override or get_mongo_db()

    for event in events:
        try:
            payload = event.payload or {}
            event_type = event.event_type

            if event_type == "FINANCIAL_TRANSFER_COMPLETED":
                src = payload.get("source_account_number") or f"ACC-{payload.get('source_account_id')}"
                dst = payload.get("destination_account_number") or f"ACC-{payload.get('destination_account_id')}"
                amount = float(payload.get("amount", 0.0))

                # Project nodes into MongoDB Fraud Graph
                mongo.fraud_graph_nodes.update_one(
                    {"node_id": src},
                    {"$set": {"node_id": src, "node_type": "ACCOUNT", "account_number": src, "updated_at": datetime.utcnow()}},
                    upsert=True
                )
                mongo.fraud_graph_nodes.update_one(
                    {"node_id": dst},
                    {"$set": {"node_id": dst, "node_type": "ACCOUNT", "account_number": dst, "updated_at": datetime.utcnow()}},
                    upsert=True
                )
                # Project directed transaction edge
                mongo.fraud_graph_edges.insert_one({
                    "from_node": src,
                    "to_node": dst,
                    "edge_type": "TRANSACTED_WITH",
                    "amount": amount,
                    "reference_no": payload.get("reference_no"),
                    "created_at": datetime.utcnow()
                })

            elif event_type == "LOAN_REPAYMENT_COMPLETED":
                src = payload.get("source_account_number") or f"ACC-{payload.get('source_account_id')}"
                dst = payload.get("destination_account_number") or "SYS-LOAN-SETTLEMENT"
                amount = float(payload.get("amount", 0.0))

                mongo.fraud_graph_edges.insert_one({
                    "from_node": src,
                    "to_node": dst,
                    "edge_type": "LOAN_SETTLEMENT",
                    "amount": amount,
                    "reference_no": payload.get("reference_no"),
                    "created_at": datetime.utcnow()
                })

            event.status = "PROCESSED"
            event.processed_at = datetime.utcnow()
            processed_count += 1

        except Exception as exc:
            event.retry_count += 1
            if event.retry_count >= 5:
                event.status = "FAILED"
                logger.error(f"Outbox event {event.id} ({event.event_id}) permanently marked FAILED after 5 retries: {exc}")
            else:
                logger.warning(f"Outbox event {event.id} ({event.event_id}) failed (retry {event.retry_count}/5): {exc}")

    db.commit()
    return processed_count


async def run_outbox_worker_loop(interval_seconds: float = 2.0):
    """
    Background asyncio daemon task started in FastAPI lifespan.
    Continuously drains pending outbox events using SKIP LOCKED.
    """
    logger.info("[*] Outbox worker background task started.")
    while True:
        try:
            db = SessionLocal()
            try:
                processed = process_outbox_batch(db, batch_size=50)
                if processed > 0:
                    logger.info(f"[+] Outbox worker processed {processed} events into Mongo fraud graph.")
            finally:
                db.close()
        except asyncio.CancelledError:
            logger.info("[*] Outbox worker task cancelled. Shutting down.")
            break
        except Exception as exc:
            logger.error(f"[-] Error in outbox worker loop: {exc}")

        await asyncio.sleep(interval_seconds)
