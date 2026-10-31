-- =========================================================================
-- Advanced Bank Management System (ABMS) - Academic DBMS Laboratory Queries
-- Database: bank_management (MySQL 8.0 InnoDB)
-- Target Demonstrations: 10 Advanced SQL Techniques & Query Engine Mechanics
-- =========================================================================

USE bank_management;

-- -------------------------------------------------------------------------
-- QUERY 1: Multi-Table JOIN (Accounts, Customers, Branches, Ledger)
-- Concept: Inner & Left Outer Joins resolving normalized relational entities
-- -------------------------------------------------------------------------
SELECT 
    b.branch_code,
    b.name AS branch_name,
    c.customer_number,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    a.account_number,
    a.account_type,
    a.balance AS current_balance,
    le.id AS latest_ledger_entry_id,
    le.entry_type,
    le.amount AS ledger_amount,
    le.balance_after,
    le.posted_at
FROM accounts a
JOIN customers c ON a.customer_id = c.id
JOIN branches b ON a.branch_id = b.id
LEFT JOIN ledger_entries le ON le.account_id = a.id
WHERE a.is_system_account = FALSE
ORDER BY b.id ASC, a.id ASC, le.posted_at DESC
LIMIT 20;


-- -------------------------------------------------------------------------
-- QUERY 2: GROUP BY with HAVING Clause
-- Concept: Aggregation, filter post-aggregation for branch deposit thresholds
-- -------------------------------------------------------------------------
SELECT 
    b.id AS branch_id,
    b.branch_code,
    b.name AS branch_name,
    b.city,
    COUNT(DISTINCT a.id) AS total_active_accounts,
    COUNT(DISTINCT c.id) AS total_customers,
    SUM(a.balance) AS aggregate_deposits,
    AVG(a.balance) AS average_account_balance
FROM branches b
JOIN accounts a ON a.branch_id = b.id
JOIN customers c ON a.customer_id = c.id
WHERE a.status = 'ACTIVE' AND a.is_system_account = FALSE
GROUP BY b.id, b.branch_code, b.name, b.city
HAVING aggregate_deposits > 50000.0000
ORDER BY aggregate_deposits DESC;


-- -------------------------------------------------------------------------
-- QUERY 3: Correlated Subquery
-- Concept: Subquery referencing outer query attribute (accounts exceeding branch avg)
-- -------------------------------------------------------------------------
SELECT 
    a.id AS account_id,
    a.account_number,
    a.branch_id,
    b.name AS branch_name,
    a.balance,
    (
        SELECT ROUND(AVG(sub_a.balance), 2)
        FROM accounts sub_a
        WHERE sub_a.branch_id = a.branch_id
          AND sub_a.is_system_account = FALSE
          AND sub_a.status = 'ACTIVE'
    ) AS branch_average_balance,
    ROUND(a.balance - (
        SELECT AVG(sub_a.balance)
        FROM accounts sub_a
        WHERE sub_a.branch_id = a.branch_id
          AND sub_a.is_system_account = FALSE
          AND sub_a.status = 'ACTIVE'
    ), 2) AS surplus_over_branch_avg
FROM accounts a
JOIN branches b ON a.branch_id = b.id
WHERE a.is_system_account = FALSE
  AND a.status = 'ACTIVE'
  AND a.balance > (
      SELECT AVG(sub_a.balance)
      FROM accounts sub_a
      WHERE sub_a.branch_id = a.branch_id
        AND sub_a.is_system_account = FALSE
        AND sub_a.status = 'ACTIVE'
  )
ORDER BY surplus_over_branch_avg DESC;


-- -------------------------------------------------------------------------
-- QUERY 4: Common Table Expressions (CTE) & Analytical Window Functions
-- Concept: Multi-level CTE, DENSE_RANK() OVER (PARTITION BY ...), Running Totals
-- -------------------------------------------------------------------------
WITH RankedTransactions AS (
    SELECT 
        t.id AS transaction_id,
        t.reference_no,
        t.transaction_type,
        t.source_account_id,
        t.destination_account_id,
        t.amount,
        t.created_at,
        DENSE_RANK() OVER (
            PARTITION BY t.source_account_id 
            ORDER BY t.amount DESC
        ) AS transaction_size_rank,
        SUM(t.amount) OVER (
            PARTITION BY t.source_account_id 
            ORDER BY t.created_at ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_outflow
    FROM transactions t
    WHERE t.status = 'COMPLETED'
)
SELECT 
    rt.transaction_id,
    rt.reference_no,
    rt.source_account_id,
    src_acc.account_number AS source_account_number,
    rt.transaction_type,
    rt.amount,
    rt.transaction_size_rank,
    rt.cumulative_outflow,
    rt.created_at
FROM RankedTransactions rt
JOIN accounts src_acc ON rt.source_account_id = src_acc.id
WHERE rt.transaction_size_rank <= 3
ORDER BY rt.source_account_id ASC, rt.transaction_size_rank ASC;


-- -------------------------------------------------------------------------
-- QUERY 5: Relational Database Views Querying
-- Concept: Materialized query abstractions across v_branch_financial_kpis
-- -------------------------------------------------------------------------
SELECT 
    kpi.branch_id,
    kpi.branch_code,
    kpi.branch_name,
    kpi.city,
    kpi.total_customers,
    kpi.active_accounts,
    kpi.total_deposits,
    kpi.total_loans,
    kpi.total_outstanding_loans,
    ROUND(
        CASE 
            WHEN kpi.total_deposits > 0 
            THEN (kpi.total_outstanding_loans / kpi.total_deposits) * 100.0 
            ELSE 0.0 
        END, 2
    ) AS credit_to_deposit_ratio_pct
FROM v_branch_financial_kpis kpi
ORDER BY kpi.total_deposits DESC;


-- -------------------------------------------------------------------------
-- QUERY 6: Stored Procedure Execution & Reconciliation Analysis
-- Concept: Encapsulated business logic verifying double-entry ledger balance
-- -------------------------------------------------------------------------
-- Check reconciliation for Customer #1 (Alex Turner, Account ID 1)
CALL sp_reconcile_account_ledger(1);

-- Check reconciliation for Customer #2 (Sarah Connor, Account ID 2)
CALL sp_reconcile_account_ledger(2);


-- -------------------------------------------------------------------------
-- QUERY 7: Transaction Atomicity & Controlled ACID Rollback Demonstration
-- Concept: Demonstrating ACID rollback to guarantee state preservation
-- -------------------------------------------------------------------------
-- Record baseline balance before atomic test
SELECT id, account_number, balance FROM accounts WHERE id IN (1, 2);

START TRANSACTION;

-- Attempt deduction
UPDATE accounts SET balance = balance - 1000.0000 WHERE id = 1;
UPDATE accounts SET balance = balance + 1000.0000 WHERE id = 2;

-- Check uncommitted state inside the transaction scope
SELECT id, account_number, balance FROM accounts WHERE id IN (1, 2);

-- Intentionally roll back to simulate mid-transaction failure
ROLLBACK;

-- Verify that baseline balance remained 100% intact (Atomicity preserved)
SELECT id, account_number, balance FROM accounts WHERE id IN (1, 2);


-- -------------------------------------------------------------------------
-- QUERY 8: Execution Plan Optimization (EXPLAIN vs EXPLAIN ANALYZE)
-- Concept: Query optimizer access paths, index seek vs table scan, cost tree
-- -------------------------------------------------------------------------
-- A) Traditional EXPLAIN (shows index usage, filtered ratio, key length)
EXPLAIN
SELECT 
    t.id, 
    t.reference_no, 
    t.amount, 
    t.created_at, 
    a.account_number 
FROM transactions t
JOIN accounts a ON t.source_account_id = a.id
WHERE t.source_account_id = 1 
  AND t.created_at >= '2026-01-01 00:00:00'
ORDER BY t.created_at DESC;

-- B) Modern EXPLAIN ANALYZE (MySQL 8.0+ actual execution engine profile)
EXPLAIN ANALYZE
SELECT 
    t.id, 
    t.reference_no, 
    t.amount, 
    t.created_at, 
    a.account_number 
FROM transactions t
JOIN accounts a ON t.source_account_id = a.id
WHERE t.source_account_id = 1 
  AND t.created_at >= '2026-01-01 00:00:00'
ORDER BY t.created_at DESC;


-- -------------------------------------------------------------------------
-- QUERY 9: Double-Entry Ledger Parity Audit (Zero-Sum Invariant)
-- Concept: Banking conservation of value: SUM(debit) MUST equal SUM(credit)
-- -------------------------------------------------------------------------
SELECT 
    COUNT(DISTINCT transaction_id) AS audited_transactions_count,
    COUNT(id) AS total_ledger_postings,
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) AS total_debits,
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) AS total_credits,
    ROUND(
        SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) - 
        SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 4
    ) AS general_ledger_discrepancy,
    CASE 
        WHEN ROUND(
            SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) - 
            SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 4
        ) = 0.0000 
        THEN 'PASSED: LEDGER IN FULL BALANCE'
        ELSE 'CRITICAL ERROR: IMBALANCE DETECTED'
    END AS audit_verdict
FROM ledger_entries;


-- -------------------------------------------------------------------------
-- QUERY 10: Fraud Network Multi-Hop Cycle Detection in Relational Topology
-- Concept: Self-join graph traversal detecting Account A -> Account B -> Account C -> Account A
-- -------------------------------------------------------------------------
SELECT 
    hop1.source_account_id AS account_A,
    hop1.destination_account_id AS account_B,
    hop2.destination_account_id AS account_C,
    hop3.destination_account_id AS cycle_back_to_A,
    hop1.amount AS amount_hop1,
    hop2.amount AS amount_hop2,
    hop3.amount AS amount_hop3,
    hop1.reference_no AS tx1_ref,
    hop2.reference_no AS tx2_ref,
    hop3.reference_no AS tx3_ref
FROM transactions hop1
JOIN transactions hop2 ON hop1.destination_account_id = hop2.source_account_id
JOIN transactions hop3 ON hop2.destination_account_id = hop3.source_account_id
WHERE hop3.destination_account_id = hop1.source_account_id
  AND hop1.source_account_id != hop2.source_account_id
  AND hop2.source_account_id != hop3.source_account_id
  AND hop1.status = 'COMPLETED'
  AND hop2.status = 'COMPLETED'
  AND hop3.status = 'COMPLETED'
  AND hop2.created_at >= hop1.created_at
  AND hop3.created_at >= hop2.created_at;
