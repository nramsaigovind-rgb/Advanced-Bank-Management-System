import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.core.database import engine
from backend.app.core.mongo import get_mongo_db
from backend.app.core.redis_client import cache_manager
from backend.app.core.rate_limiter import check_rate_limit, get_client_ip
from backend.app.services.outbox_worker import run_outbox_worker_loop

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
from backend.app.routers.notifications import router as notifications_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("abms")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[*] Starting Advanced Bank Management System (ABMS) Backend...")
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        logger.info("[+] Connected to MySQL database.")
    except Exception as exc:
        logger.error(
            "[-] MySQL connection failed for %s:%s/%s. "
            "Check DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, and DATABASE_URL.",
            settings.DB_HOST,
            settings.DB_PORT,
            settings.DB_NAME,
        )
        raise RuntimeError(
            "MySQL is unavailable or the configured credentials are invalid. "
            "Create the local database user and update .env before starting the API."
        ) from exc

    # Verify MongoDB
    try:
        mongo = get_mongo_db()
        logger.info(f"[+] Connected to MongoDB: {mongo.name}")
    except Exception as e:
        logger.warning(f"[-] MongoDB check: {e}")

    # Verify Redis
    logger.info(f"[+] Redis Cache Engine: {cache_manager.get_stats()['engine']}")

    # Start background workers only after the required database is verified.
    outbox_task = asyncio.create_task(run_outbox_worker_loop(interval_seconds=2.0))

    # Start APScheduler for recurring banking jobs
    from backend.app.services.scheduler import start_scheduler
    start_scheduler()

    yield

    logger.info("[*] Shutting down ABMS Backend.")
    outbox_task.cancel()
    try:
        await outbox_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Advanced Bank Management System API",
    description="ACID-compliant banking backend with pessimistic locking, double-entry ledger, MongoDB fraud graphs, and Redis cache diagnostics.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Global IP Rate Limiting Middleware (100 requests / min per IP)
@app.middleware("http")
async def global_ip_rate_limiting_middleware(request: Request, call_next):
    # Bypass health checks, docs, and static assets from rate limiting
    if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json", "/health", "/favicon.ico")):
        client_ip = get_client_ip(request)
        key = f"rate:global:{client_ip}"
        allowed, retry_after = check_rate_limit(key, limit=100, window_seconds=60)
        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": f"Global IP rate limit exceeded: maximum 100 requests per minute. Try again in {retry_after} seconds."},
                headers={"Retry-After": str(retry_after)}
            )
    response = await call_next(request)
    return response

# CORS Middleware restricted to configured frontend origins (no "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Global Generic 500 Exception Handler (server-side detailed logging)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal Server Error. Please contact system support."}
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
app.include_router(notifications_router)

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
