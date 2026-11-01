# Advanced Bank Management System (ABMS)

A production-grade, ACID-compliant **Bank Management System** demonstrating advanced database management systems (DBMS) concepts: pessimistic concurrency control (`SELECT ... FOR UPDATE`), double-entry ledger bookkeeping, transactional outbox patterns, MongoDB graph-based fraud analysis, Redis cache-aside acceleration, and an interactive DBMS Observatory frontend.

---

## 1. Technology Stack

- **Relational Database**: MySQL 8.0 InnoDB (Single source of truth for financial balances, accounts, and double-entry ledger)
- **Document & Graph Database**: MongoDB (Fraud detection graph, security events, append-only activity logs)
- **High-Speed Cache**: Redis (Cache-aside, rate limiting counters, session store, latency diagnostics)
- **Backend API**: Python 3.13, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, PyMySQL, PyMongo, Redis client, Argon2id
- **Frontend UI**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Lucide React

---

## 2. System Architecture & Role Dashboards

### A. Customer Online Banking Dashboard (`/customer`)
- **Total Balance & Masked Account Reveal**: View balances across savings and current accounts.
- **Instant Funds Transfer**: Transfer funds with real-time receipt and InnoDB exclusive locking.
- **Double-Entry Ledger Audit**: Inspect the exact balanced debit and credit entries behind any transaction ($\Delta \text{Balance} = \text{Credits} - \text{Debits}$).
- **Reducing-Balance Loans & EMI**: Amortization schedules calculating exact diminishing balance and installment breakdown, with online EMI payment.
- **Card Security Controls**: Immediate toggle to block/unblock physical and virtual debit cards.

### B. Bank Officer / Employee Desk (`/employee`)
- **KYC Verification Queue**: Review PAN and Aadhaar identity documents to approve/reject compliance status.
- **Customer Onboarding Desk**: Atomically register customer profiles and provision initial deposit accounts.
- **Account Freeze & Security Controls**: Temporarily freeze accounts undergoing compliance checks.

### C. Branch Executive Analytics (`/manager`)
- **Executive KPIs**: Total Branch Deposits, Withdrawals, Active Customers, Loan Book Value.
- **Recharts Financial Visualizations**: Monthly cashflow velocity (Deposits vs Withdrawals) and account distribution.
- **Loan Sanctioning**: Review originated credit applications, sanction approvals, and authorize disbursements.
- **High-Value Surveillance**: Auditing ledger transactions $\ge$ ₹5,000.

### D. System Administrator DBMS Diagnostics Observatory (`/admin/diagnostics`)
- **Interactive Concurrency Tester**: Spawns concurrent threads against a ₹5,000 balance to demonstrate `SELECT ... FOR UPDATE` row locks, lock wait queues, and mathematical prevention of negative balances.
- **Rollback Fault-Injection Simulator**: Simulates database crashes at `during_ledger` or `before_credit` stages to prove ACID atomicity and automatic rollback.
- **MySQL 8.0 Query Plan Optimizer**: Executes `EXPLAIN` and `EXPLAIN ANALYZE` on live InnoDB tables, outputting execution time in milliseconds, operator trees, and index comparisons.
- **MongoDB Fraud Graph Cycle Detection**: Traverses money-movement topologies using NetworkX (Johnson's elementary cycles) to flag circular money laundering rings.
- **Redis Cache-Aside Benchmark**: Benchmarks 20 queries side-by-side (Direct MySQL vs In-Memory Redis) displaying real speedup (>20x faster) and hit ratio.
- **Cryptographic SHA-256 Audit Verifier**: Recomputes the entire audit log hash chain to verify zero historical tampering.

---

## 3. Quick-Start Guide

### A. Run Backend API Server (FastAPI)
```powershell
# First-time setup: copy .env.example to .env and update the credentials.
# The backend requires MySQL 8.0 for authentication and banking data.
# MongoDB is required by fraud/audit features. Redis is exposed from Docker
# on 127.0.0.1:6379 for the locally running backend.
Copy-Item .env.example .env

# Option 1: start MySQL, MongoDB, Redis, and the backend with Docker:
docker compose up --build

# Option 2: use MySQL installed locally and MongoDB separately, with Redis in Docker:
# Keep DB_HOST=127.0.0.1 in .env (the hostname "mysql" is Docker-only).
# Set DB_USER=root and DB_PASSWORD to your local MySQL root password.
.\backend\venv\Scripts\python.exe database\scripts\apply_schema.py
# Start Docker Desktop, then start only Redis:
docker compose up -d redis
# Then load demo users and records with your MySQL client:
# mysql -u root -p bank_management < database/scripts/seed_10_records.sql

# Start the API in project root:
.\backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

The Docker MySQL container applies [`database/scripts/schema.sql`](database/scripts/schema.sql)
automatically on its first start. To load the demo personas and sample transactions,
apply [`database/scripts/seed_10_records.sql`](database/scripts/seed_10_records.sql) after
the database is ready. The seed file is not applied automatically so existing data is not
overwritten.

For local MySQL using your existing `root` account, do not run `setup_mysql_user.py`.
Set `DB_USER=root`, `DB_PASSWORD` to your actual local MySQL root password, and keep
`DB_HOST=127.0.0.1`. The local backend connects to Docker Redis through the published
`127.0.0.1:6379` port. If Docker Desktop is stopped, Redis falls back to the embedded
development cache.

### B. Run Frontend UI (Next.js)
```powershell
cd frontend
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

If the backend import fails with `ModuleNotFoundError: No module named 'reportlab'`,
reinstall the backend dependencies after pulling the latest changes:

```powershell
.\backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

---

## 4. Pre-Seeded Demo Personas & Credentials

The seed data contains 27 active test users. The login screen provides quick-fill
buttons for the four primary personas; the remaining seeded users can be entered manually.

### System administrator

| Username | Password | Role / access |
| :--- | :--- | :--- |
| `admin` | `Admin@123` | DBMS Observatory, concurrency, audit, fraud diagnostics |

### Branch managers

All seeded branch managers use `Manager@123`.

| Username | Password |
| :--- | :--- |
| `manager_br1` | `Manager@123` |
| `manager_br2` | `Manager@123` |
| `manager_br3` | `Manager@123` |
| `manager_br4` | `Manager@123` |
| `manager_br5` | `Manager@123` |
| `manager_br6` | `Manager@123` |
| `manager_br7` | `Manager@123` |
| `manager_br8` | `Manager@123` |
| `manager_br9` | `Manager@123` |
| `manager_br10` | `Manager@123` |

### Bank employees

All seeded bank employees use `Employee@123`.

| Username | Password |
| :--- | :--- |
| `emp_rahul` | `Employee@123` |
| `emp_priya` | `Employee@123` |
| `emp_amit` | `Employee@123` |
| `emp_sneha` | `Employee@123` |

### Retail customers

All seeded retail customers use `Customer@123`.

| Username | Password | Demo account |
| :--- | :--- | :--- |
| `alex_turner` | `Customer@123` | `1000202600` |
| `sarah_connor` | `Customer@123` | `1000202601` |
| `vikram_singh` | `Customer@123` | `1000202602` |
| `ananya_sharma` | `Customer@123` | `1000202603` |
| `rohit_verma` | `Customer@123` | `1000202604` |
| `elena_rostova` | `Customer@123` | `1000202605` |
| `david_miller` | `Customer@123` | `1000202606` |
| `meera_nair` | `Customer@123` | `1000202607` |
| `arjun_kapoor` | `Customer@123` | `1000202608` |
| `kavita_reddy` | `Customer@123` | `1000202609` |
| `suresh_patel` | `Customer@123` | `1000202610` |
| `pooja_deshmukh` | `Customer@123` | `1000202611` |

The seed currently creates users for `admin`, `branch_manager`, `employee`, and
`customer` roles only. Other roles in the permissions model do not have login users
until they are explicitly added to the seed data.

---

## 5. Automated Verification & Test Suite

Run the full integration test suite across MySQL, MongoDB, Redis, and FastAPI.
It requires all three services and the schema/seed data to be available:

```powershell
py -m venv backend\venv
.\backend\venv\Scripts\Activate.ps1
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
.\backend\venv\Scripts\pytest.exe backend\tests -v
```

**Results:** **24 passed** in 37s (11 Database & Concurrency tests, 13 API route integration tests).

Detailed presentation and mentorship scripts are documented in [`docs/demo_guide.md`](docs/demo_guide.md).

For the complete project overview, schema map, file responsibilities,
advanced database features, limitations, and validation status, see the
[`docs/project_report.md`](docs/project_report.md).
