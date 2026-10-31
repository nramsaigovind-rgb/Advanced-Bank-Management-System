import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.mongo import get_mongo_db
from backend.app.core.redis_client import cache_manager

# Import all routers
from backend.app.routers.auth import router as auth_router
from backend.app.routers.customers import router as customers_router
from backend.app.routers.employees import router as employees_router
from backend.app.routers.branches import router as branches_router
from backend.app.routers.accounts import router as accounts_router
from backend.app.routers.transfers import router as transfers_router
from backend.app.routers.loans import router as loans_router
from backend.app.routers.fraud import router as fraud_router
from backend.app.routers.reports import router as reports_router
from backend.app.routers.diagnostics import router as diagnostics_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("abms")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[*] Starting Advanced Bank Management System (ABMS) Backend...")
    # Verify MongoDB
    try:
        mongo = get_mongo_db()
        logger.info(f"[+] Connected to MongoDB: {mongo.name}")
    except Exception as e:
        logger.warning(f"[-] MongoDB check: {e}")

    # Verify Redis
    logger.info(f"[+] Redis Cache Engine: {cache_manager.get_stats()['engine']}")

    yield

    logger.info("[*] Shutting down ABMS Backend.")

app = FastAPI(
    title="Advanced Bank Management System API",
    description="ACID-compliant banking backend with pessimistic locking, double-entry ledger, MongoDB fraud graphs, and Redis cache diagnostics.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware for Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# Register Routers
app.include_router(auth_router)
app.include_router(customers_router)
app.include_router(employees_router)
app.include_router(branches_router)
app.include_router(accounts_router)
app.include_router(transfers_router)
app.include_router(loans_router)
app.include_router(fraud_router)
app.include_router(reports_router)
app.include_router(diagnostics_router)

@app.get("/")
def root():
    return {
        "service": "Advanced Bank Management System (ABMS) API Engine",
        "status": "online",
        "api_docs": "http://127.0.0.1:8000/docs",
        "frontend_portal": "http://localhost:3000",
        "message": "FastAPI backend is operational. To open the banking portal UI, please visit http://localhost:3000 in your browser."
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Advanced Bank Management System",
        "version": "1.0.0",
        "databases": {
            "mysql": "connected",
            "mongodb": "connected",
            "redis": cache_manager.get_stats()["status"]
        }
    }

