from typing import List, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token, compute_audit_hash
from backend.app.core.mongo import get_mongo_db
from backend.app.models import User, Role, AuditLog

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")
    if user.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is temporarily locked")

    return user

def require_roles(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Operation requires one of the following roles: {list(allowed_roles)}"
            )
        return current_user
    return role_checker

def require_permissions(*required_perms: str):
    def perm_checker(current_user: User = Depends(get_current_user)) -> User:
        user_perm_codes = {p.code for p in current_user.role.permissions}
        for perm in required_perms:
            if perm not in user_perm_codes:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Missing required permission '{perm}'"
                )
        return current_user
    return perm_checker

def record_audit_event(
    db: Session,
    user: Optional[User],
    action: str,
    entity_type: str,
    entity_id: str,
    payload: dict,
    request: Optional[Request] = None
):
    """
    Records an append-only audit log in MySQL with SHA-256 hash chaining,
    and also asynchronously writes to MongoDB activity logs.
    """
    ip = request.client.host if request and request.client else "127.0.0.1"
    ua = request.headers.get("user-agent") if request else "Internal Service"
    role_name = user.role.name if user and user.role else "system"
    user_id = user.id if user else None

    # Fetch last audit record for hash chaining
    last_log = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    prev_hash = last_log.record_hash if last_log else "0" * 64

    record_hash = compute_audit_hash(prev_hash, {
        "role": role_name, "action": action, "entity_type": entity_type,
        "entity_id": entity_id, "payload": payload, "ip": ip
    })

    log = AuditLog(
        user_id=user_id,
        actor_role=role_name,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        new_values=payload,
        ip_address=ip,
        user_agent=ua[:255] if ua else None,
        prev_hash=prev_hash,
        record_hash=record_hash
    )
    db.add(log)
    db.flush()

    # Mirror to MongoDB activity_logs
    try:
        mongo = get_mongo_db()
        mongo.activity_logs.insert_one({
            "user_id": user_id,
            "username": user.username if user else "system",
            "actor_role": role_name,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "payload": payload,
            "ip": ip,
            "user_agent": ua,
            "record_hash": record_hash
        })
    except Exception:
        pass

