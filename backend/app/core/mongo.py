import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

mongo_client: MongoClient = None
mongo_db = None

def get_mongo_client() -> MongoClient:
    global mongo_client
    if mongo_client is None:
        mongo_client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=2000,
            connect=True
        )
    return mongo_client

def get_mongo_db():
    global mongo_db
    if mongo_db is None:
        client = get_mongo_client()
        mongo_db = client[settings.MONGODB_DB_NAME]
        init_mongo_indexes(mongo_db)
    return mongo_db

def init_mongo_indexes(db):
    try:
        # Fraud Graph Nodes
        db.fraud_graph_nodes.create_index([("node_id", ASCENDING)], unique=True)
        db.fraud_graph_nodes.create_index([("node_type", ASCENDING)])
        db.fraud_graph_nodes.create_index([("account_id", ASCENDING)])

        # Fraud Graph Edges
        db.fraud_graph_edges.create_index([("from_node", ASCENDING), ("to_node", ASCENDING), ("edge_type", ASCENDING)])
        db.fraud_graph_edges.create_index([("edge_type", ASCENDING)])
        db.fraud_graph_edges.create_index([("created_at", DESCENDING)])

        # Activity & Security Logs
        db.activity_logs.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        db.activity_logs.create_index([("action", ASCENDING)])
        db.security_events.create_index([("event_type", ASCENDING), ("severity", ASCENDING)])
        db.security_events.create_index([("ip_address", ASCENDING)])

        logger.info("[+] MongoDB indexes initialized successfully.")
    except Exception as e:
        logger.warning(f"[-] MongoDB index init note: {e}")

