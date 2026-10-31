import logging
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.notification import Notification

logger = logging.getLogger("abms.notifications")

def send_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "SYSTEM",
    link: Optional[str] = None
) -> Notification:
    """Helper to persist a user notification."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        link=link,
        is_read=False
    )
    db.add(notif)
    try:
        db.flush()
    except Exception as e:
        logger.error(f"Failed to create notification for user {user_id}: {e}")
    return notif
