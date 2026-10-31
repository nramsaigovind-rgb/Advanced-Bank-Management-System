import networkx as nx
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.app.core.database import get_db
from backend.app.core.auth import get_current_user, require_roles, record_audit_event
from backend.app.core.mongo import get_mongo_db
from backend.app.models import FraudAlert, User, Account

router = APIRouter(prefix="/api/fraud", tags=["Fraud Detection & Graph Analytics"])

class AlertUpdate(BaseModel):
    status: str
    investigation_notes: Optional[str] = None

@router.get("/alerts")
def list_fraud_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    current_user: User = Depends(require_roles("admin", "branch_manager", "employee")),
    db: Session = Depends(get_db)
):
    query = db.query(FraudAlert)
    if status:
        query = query.filter(FraudAlert.status == status)
    if severity:
        query = query.filter(FraudAlert.severity == severity)
    alerts = query.order_by(FraudAlert.created_at.desc()).all()

    return [{
        "id": a.id,
        "alert_code": a.alert_code,
        "account_id": a.account_id,
        "account_number": a.account.account_number if a.account else None,
        "customer_name": f"{a.customer.first_name} {a.customer.last_name}" if a.customer else "Unknown",
        "risk_score": a.risk_score,
        "severity": a.severity,
        "alert_type": a.alert_type,
        "description": a.description,
        "status": a.status,
        "investigation_notes": a.investigation_notes,
        "created_at": a.created_at
    } for a in alerts]

@router.get("/graph")
def get_full_fraud_graph(
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    """
    Returns the complete fraud relationship graph (nodes & edges) from MongoDB.
    """
    mongo = get_mongo_db()
    nodes = list(mongo.fraud_graph_nodes.find({}, {"_id": 0}))
    edges = list(mongo.fraud_graph_edges.find({}, {"_id": 0}))
    return {
        "root_node_id": "ALL",
        "nodes": nodes,
        "edges": edges,
        "total_nodes": len(nodes),
        "total_edges": len(edges)
    }

@router.get("/graph/{node_or_account_id}")
def get_fraud_graph(
    node_or_account_id: str,
    depth: int = Query(2, ge=1, le=4),
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    """
    Retrieves the local multi-hop relationship graph from MongoDB (nodes & edges)
    centered around the requested account or node for graph exploration.
    """
    mongo = get_mongo_db()
    # Find matching node
    root_node = mongo.fraud_graph_nodes.find_one({"$or": [{"node_id": node_or_account_id}, {"account_number": node_or_account_id}]})
    if not root_node:
        # Fallback to returning the full seeded cluster
        nodes = list(mongo.fraud_graph_nodes.find({}, {"_id": 0}))
        edges = list(mongo.fraud_graph_edges.find({}, {"_id": 0}))
        return {"root_node_id": node_or_account_id, "nodes": nodes, "edges": edges}

    root_id = root_node["node_id"]
    # BFS collection of nodes up to depth
    visited_nodes = {root_id}
    collected_edges = []
    current_frontier = {root_id}

    for _ in range(depth):
        next_frontier = set()
        edges_found = list(mongo.fraud_graph_edges.find({
            "$or": [
                {"from_node": {"$in": list(current_frontier)}},
                {"to_node": {"$in": list(current_frontier)}}
            ]
        }, {"_id": 0}))
        for e in edges_found:
            collected_edges.append(e)
            visited_nodes.add(e["from_node"])
            visited_nodes.add(e["to_node"])
            next_frontier.add(e["from_node"])
            next_frontier.add(e["to_node"])
        current_frontier = next_frontier - visited_nodes

    collected_nodes = list(mongo.fraud_graph_nodes.find({"node_id": {"$in": list(visited_nodes)}}, {"_id": 0}))

    return {
        "root_node_id": root_id,
        "nodes": collected_nodes,
        "edges": collected_edges
    }

@router.api_route("/detect-cycles", methods=["GET", "POST"])
def detect_circular_patterns(
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    """
    Constructs a directed graph using NetworkX from MongoDB transaction edges
    and identifies all simple cycles (circular money transfer patterns).
    Supports both GET and POST requests.
    """
    mongo = get_mongo_db()
    edges = list(mongo.fraud_graph_edges.find({"edge_type": "TRANSACTED_WITH"}, {"_id": 0}))
    nodes_cursor = list(mongo.fraud_graph_nodes.find({}, {"_id": 0}))
    node_map = {n["node_id"]: n for n in nodes_cursor}

    G = nx.DiGraph()
    for e in edges:
        G.add_edge(e["from_node"], e["to_node"], amount=e.get("amount", 0))

    try:
        cycles = list(nx.simple_cycles(G))
    except Exception:
        cycles = []

    detected_loops = []
    for cycle in cycles:
        if len(cycle) >= 3:
            cycle_nodes_detail = [
                node_map.get(node_id, {"node_id": node_id, "customer_name": node_id, "risk_score": 70})
                for node_id in cycle
            ]
            detected_loops.append({
                "cycle_length": len(cycle),
                "nodes_in_cycle": cycle,
                "nodes_detail": cycle_nodes_detail,
                "pattern": " -> ".join(cycle + [cycle[0]]),
                "risk_assessment": "CRITICAL_CIRCULAR_TRANSFER_RING"
            })

    return {
        "status": "success",
        "graph_nodes_analyzed": G.number_of_nodes(),
        "graph_edges_analyzed": G.number_of_edges(),
        "circular_patterns_found": len(detected_loops),
        "total_cycles_detected": len(detected_loops),
        "suspicious_cycles": detected_loops,
        "cycles": [item["nodes_in_cycle"] for item in detected_loops],
        "all_nodes": nodes_cursor,
        "all_edges": edges
    }

@router.patch("/alerts/{id}")
def update_alert_status(
    id: int,
    req: AlertUpdate,
    request: Request,
    current_user: User = Depends(require_roles("admin", "branch_manager")),
    db: Session = Depends(get_db)
):
    alert = db.query(FraudAlert).filter(FraudAlert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = req.status
    if req.investigation_notes:
        alert.investigation_notes = req.investigation_notes
    alert.investigated_by_employee_id = current_user.employee_profile.id if current_user.employee_profile else None

    record_audit_event(
        db=db,
        user=current_user,
        action="FRAUD_ALERT_UPDATE",
        entity_type="FraudAlert",
        entity_id=str(alert.id),
        payload={"alert_code": alert.alert_code, "new_status": req.status, "notes": req.investigation_notes},
        request=request
    )
    db.commit()
    return {"message": "Alert updated successfully", "alert_id": alert.id, "status": alert.status}

