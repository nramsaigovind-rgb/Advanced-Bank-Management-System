# Advanced Bank Management System (ABMS)
## Master Demonstration & Mentorship Walkthrough Guide

---

### Table of Contents
1. [Project Overview & Architectural Highlights](#1-project-overview--architectural-highlights)
2. [Quick-Start Run Instructions](#2-quick-start-run-instructions)
3. [Pre-Seeded Demo Personas & Credentials](#3-pre-seeded-demo-personas--credentials)
4. [Mentorship Demonstration Walkthrough](#4-mentorship-demonstration-walkthrough)
   - [Station 1: System Administrator & DBMS Observatory](#station-1-system-administrator--dbms-observatory)
   - [Station 2: Customer Online Banking Portal](#station-2-customer-online-banking-portal)
   - [Station 3: Bank Officer / Employee Desk](#station-3-bank-officer--employee-desk)
   - [Station 4: Branch Executive Analytics](#station-4-branch-executive-analytics)
5. [Database Verification & Automated Test Suites](#5-database-verification--automated-test-suites)

---

### 1. Project Overview & Architectural Highlights

The **Advanced Bank Management System (ABMS)** is an enterprise-grade banking platform architected to demonstrate core and advanced Database Management System (DBMS) concepts under real banking workloads:

- **MySQL 8.0 (InnoDB Storage Engine):**
  - **Single Source of Truth** for balances and transactions.
  - **Strict 3NF Schema** with `DECIMAL(15,2)` precision, primary/foreign key constraints, and CHECK constraints preventing negative balances.
  - **Double-Entry Bookkeeping:** Every transaction generates balanced `DEBIT` and `CREDIT` ledger records ($\sum \text{Debits} = \sum \text{Credits}$).
  - **Pessimistic Concurrency Control:** Enforces row-level exclusive locks using `SELECT ... FOR UPDATE` acquired in ascending Account ID order (`MIN(A, B)` then `MAX(A, B)`) to guarantee deadlock freedom.
  - **Outbox Pattern:** Publishes committed events to asynchronous stores.
  - **Cryptographic Audit Log:** SHA-256 hash chaining ensures historical records cannot be altered or truncated.

- **MongoDB (NoSQL Document & Graph Store):**
  - High-performance storage of transaction topologies and device relationship graphs.
  - Elementary cycle detection (Johnson's algorithm via NetworkX) flags circular money-laundering rings ($A \to B \to C \to A$).

- **Redis (Cache-Aside Engine):**
  - Accelerates read-heavy branch analytics and session states.
  - Measured latency acceleration (>20x faster than relational queries).

- **Modern Web Architecture:**
  - **Backend:** FastAPI (Python 3.13), SQLAlchemy 2.0, Alembic, PyMySQL, PyMongo, Redis, Argon2id.
  - **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, Lucide Icons. Designed with a clean light aqua aesthetic (`#F1F8F8`) and dark navy typography.

---

### 2. Quick-Start Run Instructions

#### Prerequisites
- MySQL 8.0 running on `localhost:3306` with database `bank_management` and user `bank_app`.
- MongoDB running on `localhost:27017`.
- Redis (optional; automatically falls back to high-fidelity cache manager if Redis server is inactive).
- Node.js v20+ / v22+ and Python 3.13.

#### A. Starting the FastAPI Backend Server
```powershell
# Navigate to project root
cd /path/to/Advanced-Bank-Management-System

# Run with virtual environment
.\backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Documentation is available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)*

#### B. Starting the Next.js Frontend
```powershell
# In a new terminal window:
cd frontend

# Launch dev server (or 'npm start' for production)
npm run dev
```
*Frontend Application is accessible at: [http://localhost:3000](http://localhost:3000)*

---

### 3. Pre-Seeded Demo Personas & Credentials

The login screen features **1-Click Quick Demo Persona Buttons** to instantly log into each role:

| Role | Username | Password | Purpose / Key Features |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin` | `Admin@123` | **DBMS Observatory & Concurrency Lab** |
| **Branch Manager** | `manager_br1` | `Manager@123` | **Branch KPIs, Recharts, Loan Sanctioning** |
| **Bank Officer** | `emp_rahul` | `Employee@123` | **KYC Verification, Customer Onboarding** |
| **Retail Customer** | `alex_turner` | `Customer@123` | **Balance, Transfers, Ledger Audit, Loans** |

---

### 4. Mentorship Demonstration Walkthrough

#### Station 1: System Administrator & DBMS Observatory
*Navigate to `/admin/diagnostics` (or click "DBMS Lab" on the login screen).*

1. **Interactive Concurrency Race Tester (Tab 1):**
   - **Scenario:** Target Account #1 holds ₹5,000.
   - Click **"Execute Concurrency Race"** (spawns 2 threads simultaneously: Tx1 for ₹4,000 and Tx2 for ₹3,000).
   - **Observation:** Notice the timeline: Thread 1 acquires the row lock first and commits. Thread 2 waits, checks available balance (now ₹1,000), fails the constraint, and rolls back cleanly with HTTP 422.
   - **Key DBMS Proof:** Final balance is strictly ₹1,000. Lost updates and negative balances are mathematically prevented.

2. **Fault-Injection & ACID Rollback Simulator (Tab 2):**
   - Select fault stage: `during_ledger` (simulating database disconnect after balances change but before ledger writing).
   - Click **"Trigger Simulated Failure"**.
   - **Observation:** Exception is caught; InnoDB issues an atomic `ROLLBACK`.
   - **Key DBMS Proof:** Account balances for both parties are 100% untouched; zero partial financial states exist.

3. **MySQL 8.0 Query Plan & EXPLAIN ANALYZE (Tab 3):**
   - Click through allowlisted analytical queries (e.g. Indexed Customer Statement vs Table Scan).
   - Click **"Re-Run EXPLAIN ANALYZE"**.
   - **Observation:** Review the operator tree, index used (`idx_tx_source_created`), actual rows, and execution cost in milliseconds directly from MySQL 8.0.

4. **MongoDB Fraud Graph Cycle Detection (Tab 4):**
   - Click **"Run Cycle Detection"**.
   - **Observation:** Traverses the MongoDB directed transfer graph using Johnson's elementary cycle algorithm (NetworkX) and surfaces the circular money laundering ring ($A \to B \to C \to A$) with critical severity alert.

5. **Redis Cache-Aside Benchmark (Tab 5):**
   - Click **"Run Benchmark"** (executes 20 queries side-by-side).
   - **Observation:** Shows real measured speedup (e.g., MySQL 18ms vs Redis 0.8ms = >20x faster). Displays cache hit ratio and hit/miss counters.

6. **Cryptographic SHA-256 Chained Audit Verifier (Tab 6):**
   - Click **"Verify Cryptographic Chain"**.
   - **Observation:** Re-hashes each historical event ($H_i = \text{SHA256}(H_{i-1} + \text{actor} + \text{action} + \text{payload})$) and mathematically proves that historical records have zero tampering.

---

#### Station 2: Customer Online Banking Portal
*Log in as `alex_turner` / `Customer@123` (or switch role from sidebar).*

1. **Hero Balance Card & Masked Account:**
   - Displays available balance across accounts.
   - Click the eye icon to unmask/mask the account number.
2. **Instant Fund Transfer with Pessimistic Locking:**
   - Click **"Send Money"**.
   - Enter destination account (e.g., `6` for Sarah Connor), amount `500`, remark `Consulting fee`.
   - Click **"Authorize Transfer"**.
   - Displays real-time transaction receipt with reference number and ACID commit guarantee.
3. **Double-Entry Ledger Audit Inspector:**
   - In the **Transaction History** table, click **"Inspect"** on any transaction.
   - Displays the balanced ledger rows showing debit to the source and credit to the destination or clearing account ($\Delta \text{Balance} = \text{Credits} - \text{Debits}$).
4. **Reducing-Balance Loan Amortization Schedule:**
   - Click **"Loans & EMI"** in the sidebar.
   - Shows active loans with reducing-balance amortization schedules.
   - Click **"Pay EMI"** to execute payment settlement through the double-entry ledger.
5. **Card Controls:**
   - Click **"Block Card"** / **"Unblock Card"** to toggle simulated debit card security.

---

#### Station 3: Bank Officer / Employee Desk
*Log in as `emp_rahul` / `Employee@123`.*

1. **Branch Overview & KYC Verification Queue:**
   - Displays KYC profiles and compliance status.
   - Click **"Verify & Approve"** to promote the customer to Tier-1 compliance, with automatic audit logging.
2. **Customer Onboarding Desk:**
   - Click **"+ Onboard New Customer"**.
   - Fill in KYC credentials (PAN, Aadhaar, Initial Deposit).
   - Submits atomically to create both the Customer record and initial Savings/Current account.
3. **Account Freeze & Security Controls:**
   - Locate any customer account and click **"Freeze Account"** to lock withdrawals during investigation.

---

#### Station 4: Branch Executive Analytics
*Log in as `manager_br1` / `Manager@123`.*

1. **Executive Financial KPIs:**
   - Total Branch Deposits, Total Withdrawals, Active Customers, Loan Book Value.
2. **Interactive Visualizations (Recharts):**
   - **Monthly Cashflow Velocity:** Bar chart comparing monthly deposits vs withdrawals.
   - **Account Classification Ratio:** Donut chart showing Savings vs Current vs Fixed Deposits.
3. **Branch Filter:**
   - Switch branch selector dropdown to view Branch #2 (Mumbai BKC), Branch #3 (Bengaluru), or Branch #4 (Hyderabad).
4. **Loan Sanctioning Workbench:**
   - Review pending loan applications originated by officers.
   - Click **"Approve Loan"** and **"Disburse to Account #1"**.
5. **High-Value Transaction Surveillance:**
   - Real-time audit view tracking transactions $\ge$ ₹5,000.

---

### 5. Database Verification & Automated Test Suites

All 24 automated integration tests can be verified at any time with pytest:

```powershell
# Run the complete test suite
.\backend\venv\Scripts\pytest.exe backend\tests -v
```

**Results:**
- `test_database.py` (11 Tests):
  - Database connectivity, entity presence, negative balance constraint rejections, double-entry zero-sum balancing, stored procedures (`sp_reconcile_account_ledger`), analytical views (`v_branch_financial_kpis`), MongoDB fraud graph edges, Redis cache operations.
- `test_api.py` (13 Tests):
  - JWT authentication, role authorization, pessimistic locking transfer execution, insufficient funds rollback, fault-injection rollback, concurrency race condition, SQL EXPLAIN endpoint, Redis benchmark, cryptographic audit chain verification, MongoDB fraud cycle detection.

---
*Created for the Advanced Bank Management System Academic & Industry Project Defense.*

