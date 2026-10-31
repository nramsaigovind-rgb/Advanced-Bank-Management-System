-- =========================================================================
-- Advanced Bank Management System - Primary Relational Database Schema
-- Target Engine: MySQL 8.0 InnoDB (ACID Compliant, Strict Constraints)
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES & PERMISSIONS
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. USERS (Credentials separated from business entities)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    last_login DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BRANCHES
DROP TABLE IF EXISTS branches;
CREATE TABLE branches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    branch_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(60) NOT NULL,
    state VARCHAR(60) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. EMPLOYEES
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    branch_id BIGINT NOT NULL,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    designation VARCHAR(60) NOT NULL,
    department VARCHAR(60) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    hire_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_emp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_emp_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CUSTOMERS
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    branch_id BIGINT NOT NULL,
    customer_number VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(60) NOT NULL,
    state VARCHAR(60) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    pan_number VARCHAR(20) NOT NULL UNIQUE,
    kyc_status ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    kyc_document_type VARCHAR(50) NOT NULL,
    kyc_document_id VARCHAR(50) NOT NULL,
    verified_by_employee_id BIGINT NULL,
    verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cust_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cust_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT fk_cust_verified_by FOREIGN KEY (verified_by_employee_id) REFERENCES employees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ACCOUNTS
DROP TABLE IF EXISTS accounts;
CREATE TABLE accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id BIGINT NULL,
    branch_id BIGINT NULL,
    account_type ENUM('SAVINGS', 'CHECKING', 'SYSTEM_CLEARING', 'LOAN_SETTLEMENT') NOT NULL,
    balance DECIMAL(18, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM('ACTIVE', 'FROZEN', 'DORMANT', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    is_system_account BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_acc_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_acc_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT chk_acc_balance CHECK (balance >= 0.0000 OR is_system_account = TRUE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. CARDS
DROP TABLE IF EXISTS cards;
CREATE TABLE cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_id BIGINT NOT NULL,
    card_number_masked VARCHAR(20) NOT NULL,
    card_number_hash VARCHAR(64) NOT NULL UNIQUE,
    card_type ENUM('DEBIT', 'CREDIT') NOT NULL,
    expiry_month INT NOT NULL,
    expiry_year INT NOT NULL,
    daily_atm_limit DECIMAL(15, 2) NOT NULL DEFAULT 50000.00,
    daily_pos_limit DECIMAL(15, 2) NOT NULL DEFAULT 100000.00,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    block_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_card_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT chk_card_exp_month CHECK (expiry_month BETWEEN 1 AND 12),
    CONSTRAINT chk_card_exp_year CHECK (expiry_year >= 2026)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BENEFICIARIES
DROP TABLE IF EXISTS beneficiaries;
CREATE TABLE beneficiaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    beneficiary_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(30) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    daily_limit DECIMAL(15, 2) NOT NULL DEFAULT 200000.00,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ben_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT uq_cust_ben_account UNIQUE (customer_id, account_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. FINANCIAL TRANSACTIONS & DOUBLE-ENTRY LEDGER
DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS transactions;

CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reference_no VARCHAR(40) NOT NULL UNIQUE,
    idempotency_key VARCHAR(64) NULL UNIQUE,
    source_account_id BIGINT NOT NULL,
    destination_account_id BIGINT NOT NULL,
    amount DECIMAL(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    transaction_type ENUM('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'INTEREST_CREDIT') NOT NULL,
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'ROLLED_BACK') NOT NULL DEFAULT 'PENDING',
    description VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    CONSTRAINT fk_tx_src_acc FOREIGN KEY (source_account_id) REFERENCES accounts(id),
    CONSTRAINT fk_tx_dst_acc FOREIGN KEY (destination_account_id) REFERENCES accounts(id),
    CONSTRAINT chk_tx_amount CHECK (amount > 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ledger_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    entry_type ENUM('DEBIT', 'CREDIT') NOT NULL,
    amount DECIMAL(18, 4) NOT NULL,
    balance_after DECIMAL(18, 4) NOT NULL,
    posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_le_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_le_account FOREIGN KEY (account_id) REFERENCES accounts(id),
    CONSTRAINT chk_le_amount CHECK (amount > 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. LOANS & AMORTIZATION REPAYMENT SCHEDULES
DROP TABLE IF EXISTS loan_payments;
DROP TABLE IF EXISTS loan_installments;
DROP TABLE IF EXISTS loans;

CREATE TABLE loans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    loan_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    disbursement_account_id BIGINT NOT NULL,
    loan_type ENUM('PERSONAL', 'HOME', 'AUTO', 'BUSINESS') NOT NULL,
    principal_amount DECIMAL(18, 4) NOT NULL,
    annual_interest_rate DECIMAL(5, 2) NOT NULL,
    tenure_months INT NOT NULL,
    monthly_emi DECIMAL(18, 4) NOT NULL,
    outstanding_principal DECIMAL(18, 4) NOT NULL,
    outstanding_interest DECIMAL(18, 4) NOT NULL,
    status ENUM('APPLIED', 'APPROVED', 'DISBURSED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'APPLIED',
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME NULL,
    disbursed_at DATETIME NULL,
    approved_by_employee_id BIGINT NULL,
    CONSTRAINT fk_loan_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_loan_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT fk_loan_disb_acc FOREIGN KEY (disbursement_account_id) REFERENCES accounts(id),
    CONSTRAINT fk_loan_approved_by FOREIGN KEY (approved_by_employee_id) REFERENCES employees(id),
    CONSTRAINT chk_loan_principal CHECK (principal_amount > 0.0000),
    CONSTRAINT chk_loan_rate CHECK (annual_interest_rate >= 0.00 AND annual_interest_rate <= 100.00),
    CONSTRAINT chk_loan_tenure CHECK (tenure_months > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE loan_installments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    principal_component DECIMAL(18, 4) NOT NULL,
    interest_component DECIMAL(18, 4) NOT NULL,
    total_amount DECIMAL(18, 4) NOT NULL,
    status ENUM('PENDING', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME NULL,
    CONSTRAINT fk_li_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
    CONSTRAINT uq_loan_installment UNIQUE (loan_id, installment_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE loan_payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    loan_id BIGINT NOT NULL,
    installment_id BIGINT NULL,
    transaction_id BIGINT NOT NULL,
    amount_paid DECIMAL(18, 4) NOT NULL,
    principal_paid DECIMAL(18, 4) NOT NULL,
    interest_paid DECIMAL(18, 4) NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lp_loan FOREIGN KEY (loan_id) REFERENCES loans(id),
    CONSTRAINT fk_lp_installment FOREIGN KEY (installment_id) REFERENCES loan_installments(id),
    CONSTRAINT fk_lp_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    CONSTRAINT chk_lp_amount CHECK (amount_paid > 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. AUDIT LOGS (Cryptographic SHA-256 Hash Chaining)
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(60) NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    user_agent VARCHAR(255) NULL,
    prev_hash VARCHAR(64) NOT NULL,
    record_hash VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TRANSACTIONAL OUTBOX EVENTS
DROP TABLE IF EXISTS outbox_events;
CREATE TABLE outbox_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(60) NOT NULL,
    aggregate_id VARCHAR(60) NOT NULL,
    payload JSON NOT NULL,
    status ENUM('PENDING', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. FRAUD ALERTS (Relational mirror for operations and audits)
DROP TABLE IF EXISTS fraud_alerts;
CREATE TABLE fraud_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    alert_code VARCHAR(40) NOT NULL UNIQUE,
    account_id BIGINT NULL,
    customer_id BIGINT NULL,
    risk_score INT NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('NEW', 'UNDER_INVESTIGATION', 'RESOLVED', 'FALSE_POSITIVE') NOT NULL DEFAULT 'NEW',
    investigated_by_employee_id BIGINT NULL,
    investigation_notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fa_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    CONSTRAINT fk_fa_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_fa_investigator FOREIGN KEY (investigated_by_employee_id) REFERENCES employees(id),
    CONSTRAINT chk_fa_score CHECK (risk_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- INDEXING STRATEGY (High-Frequency Queries & Concurrency)
-- =========================================================================

-- Account lookups and concurrency
CREATE INDEX idx_accounts_customer ON accounts(customer_id);
CREATE INDEX idx_accounts_branch_type ON accounts(branch_id, account_type);
CREATE INDEX idx_accounts_status ON accounts(status);

-- Financial transactions and statements
CREATE INDEX idx_tx_src_created ON transactions(source_account_id, created_at DESC);
CREATE INDEX idx_tx_dst_created ON transactions(destination_account_id, created_at DESC);
CREATE INDEX idx_tx_status_type ON transactions(status, transaction_type);
CREATE INDEX idx_tx_created ON transactions(created_at);

-- Ledger reconciliation queries
CREATE INDEX idx_le_acc_posted ON ledger_entries(account_id, posted_at DESC);
CREATE INDEX idx_le_tx_entry ON ledger_entries(transaction_id, entry_type);

-- Loans and overdue tracking
CREATE INDEX idx_loans_customer ON loans(customer_id, status);
CREATE INDEX idx_loans_branch ON loans(branch_id, status);
CREATE INDEX idx_li_loan_due ON loan_installments(loan_id, due_date, status);
CREATE INDEX idx_li_status_due ON loan_installments(status, due_date);

-- Audit query performance
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_user_action ON audit_logs(user_id, action, created_at DESC);

-- Outbox polling
CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at ASC);

-- =========================================================================
-- DATABASE VIEWS (Advanced SQL Demonstrations)
-- =========================================================================

-- 1. Account Summary View
DROP VIEW IF EXISTS v_account_summaries;
CREATE VIEW v_account_summaries AS
SELECT 
    a.id AS account_id,
    a.account_number,
    a.account_type,
    a.balance,
    a.currency,
    a.status AS account_status,
    c.id AS customer_id,
    c.customer_number,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.phone,
    c.email,
    b.id AS branch_id,
    b.branch_code,
    b.name AS branch_name,
    b.city AS branch_city
FROM accounts a
LEFT JOIN customers c ON a.customer_id = c.id
LEFT JOIN branches b ON a.branch_id = b.id
WHERE a.is_system_account = FALSE;

-- 2. Branch Financial KPIs View
DROP VIEW IF EXISTS v_branch_financial_kpis;
CREATE VIEW v_branch_financial_kpis AS
SELECT 
    b.id AS branch_id,
    b.branch_code,
    b.name AS branch_name,
    b.city,
    COUNT(DISTINCT c.id) AS total_customers,
    COUNT(DISTINCT CASE WHEN a.status = 'ACTIVE' THEN a.id END) AS active_accounts,
    COALESCE(SUM(CASE WHEN a.account_type IN ('SAVINGS', 'CHECKING') THEN a.balance ELSE 0 END), 0) AS total_deposits,
    COUNT(DISTINCT l.id) AS total_loans,
    COALESCE(SUM(CASE WHEN l.status IN ('DISBURSED', 'APPROVED') THEN l.outstanding_principal ELSE 0 END), 0) AS total_outstanding_loans
FROM branches b
LEFT JOIN customers c ON c.branch_id = b.id
LEFT JOIN accounts a ON a.branch_id = b.id AND a.is_system_account = FALSE
LEFT JOIN loans l ON l.branch_id = b.id
GROUP BY b.id, b.branch_code, b.name, b.city;

-- 3. Customer Loan Portfolio View
DROP VIEW IF EXISTS v_customer_loan_overview;
CREATE VIEW v_customer_loan_overview AS
SELECT 
    l.id AS loan_id,
    l.loan_number,
    l.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    l.loan_type,
    l.principal_amount,
    l.annual_interest_rate,
    l.tenure_months,
    l.monthly_emi,
    l.outstanding_principal,
    l.outstanding_interest,
    l.status AS loan_status,
    COUNT(li.id) AS total_installments,
    SUM(CASE WHEN li.status = 'PAID' THEN 1 ELSE 0 END) AS paid_installments,
    SUM(CASE WHEN li.status = 'OVERDUE' THEN 1 ELSE 0 END) AS overdue_installments
FROM loans l
JOIN customers c ON l.customer_id = c.id
LEFT JOIN loan_installments li ON l.id = li.loan_id
GROUP BY l.id, l.loan_number, l.customer_id, c.first_name, c.last_name, l.loan_type,
         l.principal_amount, l.annual_interest_rate, l.tenure_months, l.monthly_emi,
         l.outstanding_principal, l.outstanding_interest, l.status;

-- =========================================================================
-- STORED PROCEDURES (Database Diagnostics & Integrity Auditing)
-- =========================================================================

DELIMITER $$

-- Procedure 1: Reconcile Account Balance against Double-Entry Ledger
DROP PROCEDURE IF EXISTS sp_reconcile_account_ledger$$
CREATE PROCEDURE sp_reconcile_account_ledger(IN p_account_id BIGINT)
BEGIN
    DECLARE v_current_balance DECIMAL(18, 4);
    DECLARE v_credits DECIMAL(18, 4);
    DECLARE v_debits DECIMAL(18, 4);
    DECLARE v_calculated_balance DECIMAL(18, 4);
    DECLARE v_discrepancy DECIMAL(18, 4);

    -- Fetch recorded balance
    SELECT balance INTO v_current_balance FROM accounts WHERE id = p_account_id;

    -- Aggregate credits and debits from committed ledger entries
    SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0)
    INTO v_credits, v_debits
    FROM ledger_entries
    WHERE account_id = p_account_id;

    SET v_calculated_balance = v_credits - v_debits;
    SET v_discrepancy = v_current_balance - v_calculated_balance;

    SELECT 
        p_account_id AS account_id,
        v_current_balance AS account_balance,
        v_credits AS total_credits,
        v_debits AS total_debits,
        v_calculated_balance AS calculated_ledger_balance,
        v_discrepancy AS balance_discrepancy,
        CASE WHEN v_discrepancy = 0 THEN 'BALANCED' ELSE 'DISCREPANCY_DETECTED' END AS reconciliation_status;
END$$

-- Procedure 2: Branch Financial Health Report with CTE
DROP PROCEDURE IF EXISTS sp_branch_financial_summary$$
CREATE PROCEDURE sp_branch_financial_summary(IN p_branch_id BIGINT)
BEGIN
    WITH BranchTxSummary AS (
        SELECT 
            COUNT(t.id) AS total_transactions,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'DEPOSIT' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0) AS total_deposited,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'WITHDRAWAL' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0) AS total_withdrawn,
            COALESCE(SUM(CASE WHEN t.transaction_type = 'TRANSFER' AND t.status = 'COMPLETED' THEN t.amount ELSE 0 END), 0) AS total_transferred
        FROM accounts a
        JOIN transactions t ON (a.id = t.source_account_id OR a.id = t.destination_account_id)
        WHERE a.branch_id = p_branch_id
    )
    SELECT 
        b.id AS branch_id,
        b.branch_code,
        b.name AS branch_name,
        b.city,
        kpi.total_customers,
        kpi.active_accounts,
        kpi.total_deposits,
        kpi.total_loans,
        kpi.total_outstanding_loans,
        tx.total_transactions,
        tx.total_deposited,
        tx.total_withdrawn,
        tx.total_transferred
    FROM branches b
    JOIN v_branch_financial_kpis kpi ON b.id = kpi.branch_id
    CROSS JOIN BranchTxSummary tx
    WHERE b.id = p_branch_id;
END$$

DELIMITER ;

