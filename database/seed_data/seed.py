import os
import sys
import hashlib
from datetime import datetime, date, timedelta
from decimal import Decimal

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.database import SessionLocal, engine
from backend.app.core.security import get_password_hash, compute_audit_hash
from backend.app.core.mongo import get_mongo_db
from backend.app.core.redis_client import cache_manager
from backend.app.models import (
    Role, Permission, User, Branch, Employee, Customer,
    Account, Card, Beneficiary, Transaction, LedgerEntry,
    Loan, LoanInstallment, LoanPayment, AuditLog, FraudAlert, OutboxEvent
)

def seed_database():
    print("[*] Starting database seeding process...")
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"[!] Database already contains {existing_users} users. Cleaning up existing data for fresh seed...")
            db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            for table in [
                "loan_payments", "loan_installments", "loans",
                "ledger_entries", "transactions", "cards", "beneficiaries",
                "accounts", "customers", "employees", "branches",
                "audit_logs", "outbox_events", "fraud_alerts",
                "role_permissions", "users", "permissions", "roles"
            ]:
                db.execute(text(f"TRUNCATE TABLE {table};"))
            db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            db.commit()

        # ---------------------------------------------------------
        # 1. ROLES & PERMISSIONS
        # ---------------------------------------------------------
        print("[*] Seeding Roles & Permissions...")
        role_admin = Role(name="admin", display_name="System Administrator", description="Full administrative and diagnostic control")
        role_manager = Role(name="branch_manager", display_name="Branch Manager", description="Branch operations, approvals, and reports")
        role_employee = Role(name="employee", display_name="Bank Employee", description="Customer servicing, KYC verification, account management")
        role_customer = Role(name="customer", display_name="Bank Customer", description="Personal retail banking portal user")

        db.add_all([role_admin, role_manager, role_employee, role_customer])
        db.flush()

        permission_specs = [
            ("account:create", "Create Bank Account", "Account Management"),
            ("account:view", "View Bank Account Details", "Account Management"),
            ("account:freeze", "Freeze or Deactivate Account", "Account Management"),
            ("account:close", "Close Account", "Account Management"),
            ("customer:create", "Register New Customer", "Customer Servicing"),
            ("customer:view", "View Customer Profile", "Customer Servicing"),
            ("customer:update", "Update Customer Details", "Customer Servicing"),
            ("customer:kyc_verify", "Perform KYC Verification", "Customer Servicing"),
            ("tx:transfer", "Transfer Funds", "Financial Transactions"),
            ("tx:deposit", "Process Deposit", "Financial Transactions"),
            ("tx:withdraw", "Process Withdrawal", "Financial Transactions"),
            ("tx:view", "View Transaction Statements", "Financial Transactions"),
            ("loan:apply", "Apply for Loan", "Loan Services"),
            ("loan:review", "Review Loan Application", "Loan Services"),
            ("loan:approve", "Approve Loan Application", "Loan Services"),
            ("loan:disburse", "Disburse Loan Funds", "Loan Services"),
            ("loan:repay", "Process Loan Repayment", "Loan Services"),
            ("reports:view_branch", "View Branch Analytics", "Reporting"),
            ("system:diagnostics", "Access DBMS Diagnostics & Explain Analyzer", "System Administration"),
            ("system:audit", "View Audit Logs & Integrity", "System Administration"),
            ("fraud:investigate", "Investigate Fraud Alerts & View Graph", "Fraud Detection")
        ]

        permissions_dict = {}
        for code, name, cat in permission_specs:
            p = Permission(code=code, name=name, category=cat, description=f"Grants privilege to {name.lower()}")
            db.add(p)
            permissions_dict[code] = p
        db.flush()

        # Assign permissions
        role_admin.permissions = list(permissions_dict.values())
        role_manager.permissions = [
            permissions_dict[code] for code in [
                "account:view", "customer:view", "tx:view", "loan:review", "loan:approve",
                "reports:view_branch", "fraud:investigate", "system:diagnostics"
            ]
        ]
        role_employee.permissions = [
            permissions_dict[code] for code in [
                "account:create", "account:view", "account:freeze", "customer:create",
                "customer:view", "customer:update", "customer:kyc_verify",
                "tx:deposit", "tx:withdraw", "tx:view", "loan:review", "loan:repay"
            ]
        ]
        role_customer.permissions = [
            permissions_dict[code] for code in [
                "account:view", "tx:transfer", "tx:view", "loan:apply", "loan:repay"
            ]
        ]
        db.flush()

        # ---------------------------------------------------------
        # 2. BRANCHES
        # ---------------------------------------------------------
        print("[*] Seeding Bank Branches...")
        branches = [
            Branch(branch_code="BR001", name="Downtown Main Branch", ifsc_code="ABMS0001001", address="101 MG Road, Financial District", city="Bengaluru", state="Karnataka", postal_code="560001", phone="+91 80 2200 1001", email="branch.downtown@abmsbank.com"),
            Branch(branch_code="BR002", name="Tech Corridor Branch", ifsc_code="ABMS0001002", address="Plot 45, Electronics City Phase 1", city="Bengaluru", state="Karnataka", postal_code="560100", phone="+91 80 2200 1002", email="branch.techcorridor@abmsbank.com"),
            Branch(branch_code="BR003", name="Metro Central Branch", ifsc_code="ABMS0001003", address="88 Connaught Place", city="New Delhi", state="Delhi", postal_code="110001", phone="+91 11 2300 1003", email="branch.metro@abmsbank.com"),
            Branch(branch_code="BR004", name="Financial Hub BKC", ifsc_code="ABMS0001004", address="Tower B, Bandra Kurla Complex", city="Mumbai", state="Maharashtra", postal_code="400051", phone="+91 22 2600 1004", email="branch.bkc@abmsbank.com")
        ]
        db.add_all(branches)
        db.flush()

        # ---------------------------------------------------------
        # 3. USERS, EMPLOYEES & MANAGERS
        # ---------------------------------------------------------
        print("[*] Seeding Administrative & Branch Staff Users...")
        # Password hashes
        pwd_admin = get_password_hash("Admin@123")
        pwd_manager = get_password_hash("Manager@123")
        pwd_employee = get_password_hash("Employee@123")
        pwd_customer = get_password_hash("Customer@123")

        # Admin
        user_admin = User(username="admin", email="admin@abmsbank.com", password_hash=pwd_admin, role_id=role_admin.id)
        db.add(user_admin)

        # Managers (1 per branch)
        managers = []
        for i, branch in enumerate(branches, start=1):
            u_mgr = User(username=f"manager_br{i}", email=f"manager.br{i}@abmsbank.com", password_hash=pwd_manager, role_id=role_manager.id)
            db.add(u_mgr)
            db.flush()
            emp_mgr = Employee(
                user_id=u_mgr.id, branch_id=branch.id, employee_code=f"EMP-MGR-{i:03d}",
                first_name=f"Manager", last_name=f"{branch.city}", designation="Senior Branch Manager",
                department="Branch Operations", phone=f"+91 98000 100{i}", hire_date=date(2020, 1, 15)
            )
            db.add(emp_mgr)
            managers.append(emp_mgr)
        db.flush()

        # Operational Employees
        staff_data = [
            ("emp_rahul", "Rahul", "Sharma", "Senior KYC & Accounts Officer", branches[0]),
            ("emp_priya", "Priya", "Nair", "Customer Service Lead", branches[0]),
            ("emp_amit", "Amit", "Patel", "Loan Processing Officer", branches[1]),
            ("emp_sneha", "Sneha", "Kulkarni", "Retail Banking Associate", branches[2]),
        ]
        employees = []
        for uname, fname, lname, desig, br in staff_data:
            u_staff = User(username=uname, email=f"{uname}@abmsbank.com", password_hash=pwd_employee, role_id=role_employee.id)
            db.add(u_staff)
            db.flush()
            emp = Employee(
                user_id=u_staff.id, branch_id=br.id, employee_code=f"EMP-RET-{len(employees)+10:03d}",
                first_name=fname, last_name=lname, designation=desig, department="Retail Banking",
                phone=f"+91 97000 200{len(employees)+1}", hire_date=date(2021, 6, 1)
            )
            db.add(emp)
            employees.append(emp)
        db.flush()

        # ---------------------------------------------------------
        # 4. CUSTOMERS & PROFILES
        # ---------------------------------------------------------
        print("[*] Seeding Retail Customers...")
        customer_specs = [
            ("alex_turner", "Alex", "Turner", "1992-05-14", "Male", "+91 99001 11001", "alex.turner@example.com", "42 Residency Road", "Bengaluru", "Karnataka", "560025", "ABCDE1234F", "PASSPORT", "P1234567", branches[0]),
            ("sarah_connor", "Sarah", "Connor", "1988-11-20", "Female", "+91 99001 11002", "sarah.connor@example.com", "77 Koramangala 4th Block", "Bengaluru", "Karnataka", "560034", "BCDEF2345G", "DRIVING_LICENSE", "DL9876543", branches[0]),
            ("vikram_singh", "Vikram", "Singh", "1995-03-08", "Male", "+91 99001 11003", "vikram.singh@example.com", "12 Whitefield Main Rd", "Bengaluru", "Karnataka", "560066", "CDEFG3456H", "AADHAAR", "987654321012", branches[1]),
            ("ananya_sharma", "Ananya", "Sharma", "1993-09-15", "Female", "+91 99001 11004", "ananya.sharma@example.com", "88 Ring Road", "New Delhi", "Delhi", "110048", "DEFGH4567I", "PAN_CARD", "DEFGH4567I", branches[2]),
            ("rohit_verma", "Rohit", "Verma", "1990-12-05", "Male", "+91 99001 11005", "rohit.verma@example.com", "15 Nariman Point", "Mumbai", "Maharashtra", "400021", "EFGHI5678J", "PASSPORT", "P7654321", branches[3]),
            ("elena_rostova", "Elena", "Rostova", "1996-07-22", "Female", "+91 99001 11006", "elena.rostova@example.com", "23 MG Road", "Bengaluru", "Karnataka", "560001", "FGHIJ6789K", "DRIVING_LICENSE", "DL5432109", branches[0]),
            ("david_miller", "David", "Miller", "1985-02-18", "Male", "+91 99001 11007", "david.miller@example.com", "102 Defence Colony", "New Delhi", "Delhi", "110024", "GHIJK7890L", "PASSPORT", "P9988776", branches[2]),
            ("meera_nair", "Meera", "Nair", "1998-08-30", "Female", "+91 99001 11008", "meera.nair@example.com", "55 Bandra West", "Mumbai", "Maharashtra", "400050", "HIJKL8901M", "AADHAAR", "432187650987", branches[3])
        ]

        customers = []
        for i, (uname, fn, ln, dob, gdr, ph, em, addr, city, st, pc, pan, doctype, docid, br) in enumerate(customer_specs, start=1):
            u_cust = User(username=uname, email=em, password_hash=pwd_customer, role_id=role_customer.id)
            db.add(u_cust)
            db.flush()
            cust = Customer(
                user_id=u_cust.id, branch_id=br.id, customer_number=f"CUST-{20260000+i}",
                first_name=fn, last_name=ln, date_of_birth=datetime.strptime(dob, "%Y-%m-%d").date(),
                gender=gdr, phone=ph, email=em, address=addr, city=city, state=st, postal_code=pc,
                pan_number=pan, kyc_status="VERIFIED", kyc_document_type=doctype, kyc_document_id=docid,
                verified_by_employee_id=employees[0].id, verified_at=datetime.utcnow() - timedelta(days=90)
            )
            db.add(cust)
            customers.append(cust)
        db.flush()

        # ---------------------------------------------------------
        # 5. SYSTEM CLEARING ACCOUNTS (Double-Entry Foundation)
        # ---------------------------------------------------------
        print("[*] Creating System Clearing Accounts...")
        sys_deposit = Account(
            account_number="SYS-CLEARING-DEPOSIT",
            customer_id=None, branch_id=branches[0].id,
            account_type="SYSTEM_CLEARING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        sys_withdrawal = Account(
            account_number="SYS-CLEARING-WITHDRAWAL",
            customer_id=None, branch_id=branches[0].id,
            account_type="SYSTEM_CLEARING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        sys_loan_disb = Account(
            account_number="SYS-LOAN-DISBURSEMENT",
            customer_id=None, branch_id=branches[0].id,
            account_type="SYSTEM_CLEARING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        sys_interest_inc = Account(
            account_number="SYS-INTEREST-INCOME",
            customer_id=None, branch_id=branches[0].id,
            account_type="SYSTEM_CLEARING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        db.add_all([sys_deposit, sys_withdrawal, sys_loan_disb, sys_interest_inc])
        db.flush()

        # ---------------------------------------------------------
        # 6. CUSTOMER ACCOUNTS & CARDS
        # ---------------------------------------------------------
        print("[*] Seeding Customer Accounts & Cards...")
        # Alex Turner has exactly ₹5,000 for the simultaneous transfer concurrency test!
        initial_balances = [
            Decimal("5000.0000"),   # Alex (Primary Concurrency Test Subject)
            Decimal("75000.0000"),  # Sarah
            Decimal("150000.0000"), # Vikram
            Decimal("95000.0000"),  # Ananya
            Decimal("280000.0000"), # Rohit
            Decimal("45000.0000"),  # Elena
            Decimal("120000.0000"), # David
            Decimal("65000.0000")   # Meera
        ]

        cust_accounts = []
        for i, cust in enumerate(customers):
            # Primary Savings Account
            acc = Account(
                account_number=f"1000{202600+i:06d}",
                customer_id=cust.id,
                branch_id=cust.branch_id,
                account_type="SAVINGS",
                balance=Decimal("0.0000"), # Will be funded via double-entry deposit transactions
                currency="INR",
                status="ACTIVE",
                is_system_account=False
            )
            db.add(acc)
            cust_accounts.append(acc)
        db.flush()

        # Add checking account for Alex and Rohit
        alex_checking = Account(
            account_number="2000202601",
            customer_id=customers[0].id,
            branch_id=customers[0].branch_id,
            account_type="CHECKING",
            balance=Decimal("0.0000"),
            currency="INR",
            status="ACTIVE",
            is_system_account=False
        )
        db.add(alex_checking)
        db.flush()

        # Issue Cards for Customers
        cards = []
        for i, acc in enumerate(cust_accounts):
            card_num_plain = f"4532{i+10:02d}98{i+40:02d}{1000+i:04d}"
            card_hash = hashlib.sha256(card_num_plain.encode()).hexdigest()
            card = Card(
                account_id=acc.id,
                card_number_masked=f"4532 •••• •••• {1000+i:04d}",
                card_number_hash=card_hash,
                card_type="DEBIT",
                expiry_month=10,
                expiry_year=2029,
                daily_atm_limit=Decimal("50000.00"),
                daily_pos_limit=Decimal("100000.00"),
                is_blocked=False
            )
            cards.append(card)
        db.add_all(cards)
        db.flush()

        # ---------------------------------------------------------
        # 7. BENEFICIARIES
        # ---------------------------------------------------------
        print("[*] Seeding Beneficiaries...")
        beneficiaries = [
            Beneficiary(customer_id=customers[0].id, beneficiary_name="Sarah Connor", account_number=cust_accounts[1].account_number, ifsc_code=branches[0].ifsc_code, bank_name="ABMS Bank Downtown", daily_limit=Decimal("100000.00")),
            Beneficiary(customer_id=customers[0].id, beneficiary_name="Vikram Singh", account_number=cust_accounts[2].account_number, ifsc_code=branches[1].ifsc_code, bank_name="ABMS Bank Tech Corridor", daily_limit=Decimal("50000.00")),
            Beneficiary(customer_id=customers[1].id, beneficiary_name="Alex Turner", account_number=cust_accounts[0].account_number, ifsc_code=branches[0].ifsc_code, bank_name="ABMS Bank Downtown", daily_limit=Decimal("100000.00")),
            Beneficiary(customer_id=customers[2].id, beneficiary_name="Ananya Sharma", account_number=cust_accounts[3].account_number, ifsc_code=branches[2].ifsc_code, bank_name="ABMS Bank Metro Central", daily_limit=Decimal("150000.00")),
            Beneficiary(customer_id=customers[4].id, beneficiary_name="David Miller", account_number=cust_accounts[6].account_number, ifsc_code=branches[2].ifsc_code, bank_name="ABMS Bank Metro Central", daily_limit=Decimal("200000.00")),
        ]
        db.add_all(beneficiaries)
        db.flush()

        # ---------------------------------------------------------
        # 8. INITIAL FUNDING VIA DOUBLE-ENTRY TRANSACTIONS
        # ---------------------------------------------------------
        print("[*] Executing Initial Funding Double-Entry Ledger Transactions...")
        # Deposit into each account from SYS-CLEARING-DEPOSIT
        for i, acc in enumerate(cust_accounts):
            fund_amount = initial_balances[i]
            # Update balances
            acc.balance = fund_amount
            sys_deposit.balance -= fund_amount # System clearing reflects net external funds in

            tx = Transaction(
                reference_no=f"TXN-DEP-{2026000+i:07d}",
                idempotency_key=f"IDEMP-DEP-{acc.account_number}",
                source_account_id=sys_deposit.id,
                destination_account_id=acc.id,
                amount=fund_amount,
                currency="INR",
                transaction_type="DEPOSIT",
                status="COMPLETED",
                description=f"Initial account deposit for {customers[i].first_name} {customers[i].last_name}",
                created_at=datetime.utcnow() - timedelta(days=30),
                completed_at=datetime.utcnow() - timedelta(days=30)
            )
            db.add(tx)
            db.flush()

            # Double-Entry Ledger:
            # 1. Debit Source (Clearing Account)
            # 2. Credit Destination (Customer Account)
            le_debit = LedgerEntry(
                transaction_id=tx.id,
                account_id=sys_deposit.id,
                entry_type="DEBIT",
                amount=fund_amount,
                balance_after=sys_deposit.balance,
                posted_at=tx.created_at
            )
            le_credit = LedgerEntry(
                transaction_id=tx.id,
                account_id=acc.id,
                entry_type="CREDIT",
                amount=fund_amount,
                balance_after=acc.balance,
                posted_at=tx.created_at
            )
            db.add_all([le_debit, le_credit])

        # Initial deposit for Alex's checking account (₹25,000)
        alex_checking.balance = Decimal("25000.0000")
        sys_deposit.balance -= Decimal("25000.0000")
        tx_chk = Transaction(
            reference_no="TXN-DEP-2026999",
            idempotency_key="IDEMP-DEP-2000202601",
            source_account_id=sys_deposit.id,
            destination_account_id=alex_checking.id,
            amount=Decimal("25000.0000"),
            currency="INR",
            transaction_type="DEPOSIT",
            status="COMPLETED",
            description="Initial checking account funding for Alex Turner",
            created_at=datetime.utcnow() - timedelta(days=20),
            completed_at=datetime.utcnow() - timedelta(days=20)
        )
        db.add(tx_chk)
        db.flush()
        db.add_all([
            LedgerEntry(transaction_id=tx_chk.id, account_id=sys_deposit.id, entry_type="DEBIT", amount=Decimal("25000.0000"), balance_after=sys_deposit.balance, posted_at=tx_chk.created_at),
            LedgerEntry(transaction_id=tx_chk.id, account_id=alex_checking.id, entry_type="CREDIT", amount=Decimal("25000.0000"), balance_after=alex_checking.balance, posted_at=tx_chk.created_at)
        ])
        db.flush()

        # Seed sample transfer: Sarah -> Alex (₹1,500)
        sarah_acc = cust_accounts[1]
        alex_acc = cust_accounts[0]
        xfer_amt = Decimal("1500.0000")
        sarah_acc.balance -= xfer_amt
        alex_acc.balance += xfer_amt

        tx_xfer = Transaction(
            reference_no="TXN-XFR-2026101",
            idempotency_key="IDEMP-XFR-SARAH-ALEX-1500",
            source_account_id=sarah_acc.id,
            destination_account_id=alex_acc.id,
            amount=xfer_amt,
            currency="INR",
            transaction_type="TRANSFER",
            status="COMPLETED",
            description="Dinner split reimbursement",
            created_at=datetime.utcnow() - timedelta(days=5),
            completed_at=datetime.utcnow() - timedelta(days=5)
        )
        db.add(tx_xfer)
        db.flush()

        db.add_all([
            LedgerEntry(transaction_id=tx_xfer.id, account_id=sarah_acc.id, entry_type="DEBIT", amount=xfer_amt, balance_after=sarah_acc.balance, posted_at=tx_xfer.created_at),
            LedgerEntry(transaction_id=tx_xfer.id, account_id=alex_acc.id, entry_type="CREDIT", amount=xfer_amt, balance_after=alex_acc.balance, posted_at=tx_xfer.created_at)
        ])

        # Adjust Alex's balance back to exactly ₹5,000 for the prompt's concurrency demonstration!
        # Initial 5,000 + 1,500 = 6,500. Let's debit 1,500 to bring it back to exactly ₹5,000.
        alex_acc.balance = Decimal("5000.0000")
        sys_withdrawal.balance += xfer_amt
        tx_wdl = Transaction(
            reference_no="TXN-WDL-2026102",
            idempotency_key="IDEMP-WDL-ALEX-ATM-1500",
            source_account_id=alex_acc.id,
            destination_account_id=sys_withdrawal.id,
            amount=xfer_amt,
            currency="INR",
            transaction_type="WITHDRAWAL",
            status="COMPLETED",
            description="ATM Cash Withdrawal",
            created_at=datetime.utcnow() - timedelta(days=3),
            completed_at=datetime.utcnow() - timedelta(days=3)
        )
        db.add(tx_wdl)
        db.flush()
        db.add_all([
            LedgerEntry(transaction_id=tx_wdl.id, account_id=alex_acc.id, entry_type="DEBIT", amount=xfer_amt, balance_after=Decimal("5000.0000"), posted_at=tx_wdl.created_at),
            LedgerEntry(transaction_id=tx_wdl.id, account_id=sys_withdrawal.id, entry_type="CREDIT", amount=xfer_amt, balance_after=sys_withdrawal.balance, posted_at=tx_wdl.created_at)
        ])
        db.flush()

        # ---------------------------------------------------------
        # 9. LOANS & AMORTIZATION REPAYMENT SCHEDULES
        # ---------------------------------------------------------
        print("[*] Seeding Loans & Reducing-Balance Amortization Schedules...")
        # Loan for Vikram Singh: ₹2,00,000 Personal Loan @ 12.00% for 12 months
        p_amount = Decimal("200000.0000")
        annual_rate = Decimal("12.00")
        tenure = 12
        monthly_rate = (annual_rate / Decimal("100")) / Decimal("12")
        # EMI formula = P * r * (1 + r)^n / ((1 + r)^n - 1)
        r_float = float(monthly_rate)
        emi_float = float(p_amount) * (r_float * (1 + r_float)**tenure) / ((1 + r_float)**tenure - 1)
        monthly_emi = Decimal(str(round(emi_float, 4)))

        loan_vikram = Loan(
            loan_number="LN-2026-00101",
            customer_id=customers[2].id,
            branch_id=customers[2].branch_id,
            disbursement_account_id=cust_accounts[2].id,
            loan_type="PERSONAL",
            principal_amount=p_amount,
            annual_interest_rate=annual_rate,
            tenure_months=tenure,
            monthly_emi=monthly_emi,
            outstanding_principal=p_amount,
            outstanding_interest=Decimal("0.0000"),
            status="DISBURSED",
            applied_at=datetime.utcnow() - timedelta(days=60),
            approved_at=datetime.utcnow() - timedelta(days=58),
            disbursed_at=datetime.utcnow() - timedelta(days=55),
            approved_by_employee_id=managers[1].id
        )
        db.add(loan_vikram)
        db.flush()

        # Generate 12 Amortization Installments
        remaining_balance = p_amount
        installments = []
        start_due_date = date.today() - timedelta(days=45)
        for num in range(1, tenure + 1):
            interest_comp = round(remaining_balance * monthly_rate, 4)
            principal_comp = round(monthly_emi - interest_comp, 4)
            if num == tenure:
                principal_comp = remaining_balance
                monthly_emi = principal_comp + interest_comp

            remaining_balance -= principal_comp
            due_d = start_due_date + timedelta(days=30 * (num - 1))
            inst_status = "PAID" if num == 1 else ("PENDING" if num == 2 else "PENDING")
            paid_d = datetime.combine(due_d + timedelta(days=2), datetime.min.time()) if num == 1 else None

            inst = LoanInstallment(
                loan_id=loan_vikram.id,
                installment_number=num,
                due_date=due_d,
                principal_component=principal_comp,
                interest_component=interest_comp,
                total_amount=monthly_emi,
                status=inst_status,
                paid_at=paid_d
            )
            installments.append(inst)
        db.add_all(installments)
        db.flush()

        # Record payment for Installment 1
        inst1 = installments[0]
        # Repayment transaction
        tx_loan_pay = Transaction(
            reference_no="TXN-LNPAY-2026001",
            idempotency_key="IDEMP-LOAN-VIKRAM-INST1",
            source_account_id=cust_accounts[2].id,
            destination_account_id=sys_interest_inc.id,
            amount=inst1.total_amount,
            currency="INR",
            transaction_type="LOAN_REPAYMENT",
            status="COMPLETED",
            description=f"EMI payment for Loan LN-2026-00101 (Inst #1)",
            created_at=datetime.utcnow() - timedelta(days=15),
            completed_at=datetime.utcnow() - timedelta(days=15)
        )
        db.add(tx_loan_pay)
        db.flush()

        # Deduct from customer account and credit system account for loan payment
        cust_accounts[2].balance -= inst1.total_amount
        sys_interest_inc.balance += inst1.total_amount

        # Double-entry ledger entries for loan payment
        db.add_all([
            LedgerEntry(transaction_id=tx_loan_pay.id, account_id=cust_accounts[2].id, entry_type="DEBIT", amount=inst1.total_amount, balance_after=cust_accounts[2].balance, posted_at=tx_loan_pay.created_at),
            LedgerEntry(transaction_id=tx_loan_pay.id, account_id=sys_interest_inc.id, entry_type="CREDIT", amount=inst1.total_amount, balance_after=sys_interest_inc.balance, posted_at=tx_loan_pay.created_at)
        ])

        loan_vikram.outstanding_principal -= inst1.principal_component
        loan_payment = LoanPayment(
            loan_id=loan_vikram.id,
            installment_id=inst1.id,
            transaction_id=tx_loan_pay.id,
            amount_paid=inst1.total_amount,
            principal_paid=inst1.principal_component,
            interest_paid=inst1.interest_component,
            payment_date=datetime.utcnow() - timedelta(days=15)
        )
        db.add(loan_payment)
        db.flush()

        # ---------------------------------------------------------
        # 10. CRYPTOGRAPHIC AUDIT LOGS (SHA-256 Hash Chained)
        # ---------------------------------------------------------
        print("[*] Creating Cryptographically Hash-Chained Audit Logs...")
        genesis_hash = "0" * 64
        audit_events = [
            ("system", "SYSTEM_INIT", "Database", "bank_management", {"event": "System initialized and tables created"}, "127.0.0.1"),
            ("admin", "USER_ROLE_ASSIGN", "User", "admin", {"role": "admin", "action": "Assigned superadmin privileges"}, "127.0.0.1"),
            ("employee", "CUSTOMER_KYC_VERIFY", "Customer", f"CUST-20260001", {"status": "VERIFIED", "officer": "emp_rahul"}, "192.168.1.10"),
            ("customer", "MONEY_TRANSFER", "Transaction", "TXN-XFR-2026101", {"from": "sarah_connor", "to": "alex_turner", "amount": 1500.0}, "192.168.1.55"),
            ("branch_manager", "LOAN_APPROVAL", "Loan", "LN-2026-00101", {"status": "APPROVED", "principal": 200000.0}, "192.168.1.100")
        ]

        curr_prev_hash = genesis_hash
        for role_name, action, ent_type, ent_id, payload, ip in audit_events:
            rec_hash = compute_audit_hash(curr_prev_hash, {
                "role": role_name, "action": action, "entity_type": ent_type,
                "entity_id": ent_id, "payload": payload, "ip": ip
            })
            log_entry = AuditLog(
                user_id=user_admin.id if role_name in ["system", "admin"] else employees[0].user_id,
                actor_role=role_name,
                action=action,
                entity_type=ent_type,
                entity_id=ent_id,
                new_values=payload,
                ip_address=ip,
                prev_hash=curr_prev_hash,
                record_hash=rec_hash,
                created_at=datetime.utcnow() - timedelta(days=10)
            )
            db.add(log_entry)
            curr_prev_hash = rec_hash
        db.flush()

        # ---------------------------------------------------------
        # 11. FRAUD ALERTS
        # ---------------------------------------------------------
        print("[*] Creating Seed Fraud Alerts...")
        alert1 = FraudAlert(
            alert_code="ALT-2026-0091",
            account_id=cust_accounts[0].id,
            customer_id=customers[0].id,
            risk_score=78,
            severity="HIGH",
            alert_type="CIRCULAR_TRANSFER_SUSPECT",
            description="Rapid multi-hop funds movement detected matching circular topology pattern.",
            status="UNDER_INVESTIGATION",
            investigated_by_employee_id=employees[0].id,
            investigation_notes="Customer Alex Turner involved in multi-account rapid relay ring. Under manual review."
        )
        alert2 = FraudAlert(
            alert_code="ALT-2026-0092",
            account_id=cust_accounts[4].id,
            customer_id=customers[4].id,
            risk_score=45,
            severity="MEDIUM",
            alert_type="SHARED_DEVICE_ACCESS",
            description="Account logged in from device previously associated with multiple distinct customer profiles.",
            status="NEW"
        )
        db.add_all([alert1, alert2])

        db.commit()
        print("[+] MySQL Relational Database successfully seeded!")

        # ---------------------------------------------------------
        # 12. MONGODB FRAUD GRAPH & ACTIVITY LOG SEEDING
        # ---------------------------------------------------------
        print("[*] Seeding MongoDB Fraud Graph & Security Events...")
        try:
            mongo = get_mongo_db()
            # Clear existing collections
            mongo.fraud_graph_nodes.delete_many({})
            mongo.fraud_graph_edges.delete_many({})
            mongo.activity_logs.delete_many({})
            mongo.security_events.delete_many({})

            # Insert Graph Nodes
            nodes = [
                # Account Nodes
                {"node_id": "ACC_ALEX", "node_type": "ACCOUNT", "account_number": cust_accounts[0].account_number, "customer_name": "Alex Turner", "risk_score": 75},
                {"node_id": "ACC_SARAH", "node_type": "ACCOUNT", "account_number": cust_accounts[1].account_number, "customer_name": "Sarah Connor", "risk_score": 20},
                {"node_id": "ACC_VIKRAM", "node_type": "ACCOUNT", "account_number": cust_accounts[2].account_number, "customer_name": "Vikram Singh", "risk_score": 15},
                {"node_id": "ACC_ROHIT", "node_type": "ACCOUNT", "account_number": cust_accounts[4].account_number, "customer_name": "Rohit Verma", "risk_score": 85},
                {"node_id": "ACC_MULE_1", "node_type": "ACCOUNT", "account_number": "8888001010", "customer_name": "Relay Mule 1", "risk_score": 92},
                {"node_id": "ACC_MULE_2", "node_type": "ACCOUNT", "account_number": "8888001020", "customer_name": "Relay Mule 2", "risk_score": 90},
                # Device & IP Nodes
                {"node_id": "DEV_SUSPECT_01", "node_type": "DEVICE", "device_fingerprint": "DEV-MAC-B8-27-EB-9A", "device_type": "Linux Workstation", "risk_score": 95},
                {"node_id": "IP_SUSPECT_VPN", "node_type": "IP_ADDRESS", "ip_address": "198.51.100.45", "isp": "Datacenter VPN Host", "risk_score": 88},
                # Beneficiary Node
                {"node_id": "BENEFICIARY_OFFSHORE", "node_type": "BENEFICIARY", "beneficiary_name": "Apex Global Escrow", "account_number": "9999009999", "risk_score": 80}
            ]
            mongo.fraud_graph_nodes.insert_many(nodes)

            # Insert Graph Edges
            edges = [
                # Circular Pattern: ACC_ALEX -> ACC_MULE_1 -> ACC_MULE_2 -> ACC_ROHIT -> ACC_ALEX
                {"from_node": "ACC_ALEX", "to_node": "ACC_MULE_1", "edge_type": "TRANSACTED_WITH", "amount": 45000.0, "tx_count": 4, "created_at": datetime.utcnow() - timedelta(days=2)},
                {"from_node": "ACC_MULE_1", "to_node": "ACC_MULE_2", "edge_type": "TRANSACTED_WITH", "amount": 44500.0, "tx_count": 3, "created_at": datetime.utcnow() - timedelta(days=1, hours=18)},
                {"from_node": "ACC_MULE_2", "to_node": "ACC_ROHIT", "edge_type": "TRANSACTED_WITH", "amount": 44000.0, "tx_count": 2, "created_at": datetime.utcnow() - timedelta(days=1, hours=10)},
                {"from_node": "ACC_ROHIT", "to_node": "ACC_ALEX", "edge_type": "TRANSACTED_WITH", "amount": 43500.0, "tx_count": 2, "created_at": datetime.utcnow() - timedelta(hours=8)},
                # Shared Device & IP Pattern (Mule 1, Mule 2, and Rohit share the same device & IP)
                {"from_node": "ACC_MULE_1", "to_node": "DEV_SUSPECT_01", "edge_type": "USED_DEVICE", "login_count": 14, "created_at": datetime.utcnow() - timedelta(days=3)},
                {"from_node": "ACC_MULE_2", "to_node": "DEV_SUSPECT_01", "edge_type": "USED_DEVICE", "login_count": 9, "created_at": datetime.utcnow() - timedelta(days=3)},
                {"from_node": "ACC_ROHIT", "to_node": "DEV_SUSPECT_01", "edge_type": "USED_DEVICE", "login_count": 21, "created_at": datetime.utcnow() - timedelta(days=2)},
                {"from_node": "ACC_MULE_1", "to_node": "IP_SUSPECT_VPN", "edge_type": "CONNECTED_IP", "session_count": 12, "created_at": datetime.utcnow() - timedelta(days=3)},
                {"from_node": "ACC_MULE_2", "to_node": "IP_SUSPECT_VPN", "edge_type": "CONNECTED_IP", "session_count": 8, "created_at": datetime.utcnow() - timedelta(days=3)},
                # Normal Retail Banking Edges
                {"from_node": "ACC_SARAH", "to_node": "ACC_ALEX", "edge_type": "TRANSACTED_WITH", "amount": 1500.0, "tx_count": 1, "created_at": datetime.utcnow() - timedelta(days=5)},
                {"from_node": "ACC_VIKRAM", "to_node": "ACC_SARAH", "edge_type": "TRANSACTED_WITH", "amount": 2500.0, "tx_count": 1, "created_at": datetime.utcnow() - timedelta(days=8)}
            ]
            mongo.fraud_graph_edges.insert_many(edges)

            # Insert Activity and Security Logs
            activities = [
                {"user_id": user_admin.id, "username": "admin", "action": "LOGIN_SUCCESS", "ip": "127.0.0.1", "status": "SUCCESS", "created_at": datetime.utcnow() - timedelta(minutes=15)},
                {"user_id": customers[0].user_id, "username": "alex_turner", "action": "TRANSFER_INITIATED", "details": {"to": "sarah_connor", "amount": 1500.0}, "status": "SUCCESS", "created_at": datetime.utcnow() - timedelta(days=5)},
                {"user_id": customers[4].user_id, "username": "rohit_verma", "action": "LOGIN_SUCCESS", "ip": "198.51.100.45", "device": "Linux Workstation", "status": "SUCCESS", "created_at": datetime.utcnow() - timedelta(hours=8)},
            ]
            mongo.activity_logs.insert_many(activities)

            sec_events = [
                {"event_type": "SUSPICIOUS_CIRCULAR_TRANSFER", "severity": "HIGH", "accounts_involved": ["ACC_ALEX", "ACC_MULE_1", "ACC_MULE_2", "ACC_ROHIT"], "amount_cycled": 45000.0, "created_at": datetime.utcnow() - timedelta(hours=6)},
                {"event_type": "SHARED_DEVICE_CLUSTER", "severity": "HIGH", "device_fingerprint": "DEV-MAC-B8-27-EB-9A", "accounts_count": 3, "created_at": datetime.utcnow() - timedelta(days=1)}
            ]
            mongo.security_events.insert_many(sec_events)
            print("[+] MongoDB Fraud Graph & Analytics successfully seeded!")
        except Exception as e:
            print(f"[-] MongoDB seeding note: {e}")

        # ---------------------------------------------------------
        # 13. WARM UP REDIS CACHE
        # ---------------------------------------------------------
        print("[*] Warming up Redis Cache...")
        try:
            cache_manager.set("bank:system:status", "OPERATIONAL", ex=3600)
            cache_manager.set(f"bank:branch:kpi:{branches[0].id}", '{"branch":"Downtown Main","status":"active"}', ex=300)
            print("[+] Redis Cache initialized and warmed.")
        except Exception as e:
            print(f"[-] Redis cache note: {e}")

        print("\n=======================================================")
        print(" [SUCCESS] Phase 2: Database & Seed Infrastructure Done!")
        print("=======================================================")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed during database seeding: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
