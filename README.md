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
# In project root:
.\backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### B. Run Frontend UI (Next.js)
```powershell
cd frontend
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

## 4. Pre-Seeded Demo Personas & Credentials

The login screen features **1-Click Quick Demo Persona Buttons** to test any role without manual typing:

| Role | Username | Password | Purpose / Key Features |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `Admin@123` | **DBMS Observatory & Concurrency Lab** |
| **Branch Manager** | `manager_br1` | `Manager@123` | **Branch KPIs, Recharts, Loan Sanctioning** |
| **Bank Officer** | `emp_rahul` | `Employee@123` | **KYC Verification, Customer Onboarding** |
| **Retail Customer** | `alex_turner` | `Customer@123` | **Balance, Transfers, Ledger Audit, Loans** |

---

## 5. Automated Verification & Test Suite

Run the full integration test suite across MySQL, MongoDB, Redis, and FastAPI:

```powershell
py -m venv backend\venv
.\backend\venv\Scripts\Activate.ps1
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
.\backend\venv\Scripts\pytest.exe backend\tests -v
```

**Results:** **24 passed** in 37s (11 Database & Concurrency tests, 13 API route integration tests).

Detailed presentation and mentorship scripts are documented in [`docs/demo_guide.md`](docs/demo_guide.md).
