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
    Loan, LoanInstallment, LoanPayment, AuditLog, FraudAlert, OutboxEvent, Notification
)

def seed_database():
    print("[*] Starting database seeding process (Target: >= 10 records across ALL tables)...")
    db: Session = SessionLocal()

    try:
        # Clean up existing data for fresh seed
        print("[!] Cleaning up existing data for fresh deterministic seed...")
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        for table in [
            "loan_payments", "loan_installments", "loans",
            "ledger_entries", "transactions", "cards", "beneficiaries",
            "accounts", "customers", "employees", "branches",
            "audit_logs", "outbox_events", "fraud_alerts", "notifications",
            "role_permissions", "users", "permissions", "roles"
        ]:
            try:
                db.execute(text(f"TRUNCATE TABLE {table};"))
            except Exception as tr_err:
                db.execute(text(f"DELETE FROM {table};"))
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        db.commit()

        # ---------------------------------------------------------
        # 1. ROLES & PERMISSIONS (>= 10 Roles)
        # ---------------------------------------------------------
        print("[*] Seeding 10 Roles & Permissions...")
        roles_data = [
            ("admin", "System Administrator", "Full administrative and diagnostic control"),
            ("branch_manager", "Branch Manager", "Branch operations, approvals, and reports"),
            ("employee", "Bank Employee", "Customer servicing, KYC verification, account management"),
            ("customer", "Bank Customer", "Personal retail banking portal user"),
            ("auditor", "Internal Auditor", "Ledger integrity verification and compliance auditing"),
            ("compliance_officer", "Compliance Officer", "AML surveillance and regulatory reporting"),
            ("loan_officer", "Loan Underwriting Officer", "Credit evaluation and loan appraisal"),
            ("wealth_manager", "Wealth Manager", "High net-worth portfolio advisory"),
            ("teller", "Front Desk Teller", "Cash deposits and withdrawals counter service"),
            ("risk_analyst", "Risk & Fraud Analyst", "Graph analytics and fraud cycle monitoring"),
        ]

        roles_dict = {}
        for code, disp, desc in roles_data:
            r = Role(name=code, display_name=disp, description=desc)
            db.add(r)
            roles_dict[code] = r
        db.flush()

        role_admin = roles_dict["admin"]
        role_manager = roles_dict["branch_manager"]
        role_employee = roles_dict["employee"]
        role_customer = roles_dict["customer"]

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
                "account:view", "customer:view", "tx:transfer", "tx:view", "loan:apply", "loan:repay"
            ]
        ]
        roles_dict["auditor"].permissions = [permissions_dict["system:audit"], permissions_dict["reports:view_branch"], permissions_dict["tx:view"]]
        roles_dict["compliance_officer"].permissions = [permissions_dict["fraud:investigate"], permissions_dict["system:audit"]]
        roles_dict["loan_officer"].permissions = [permissions_dict["loan:review"], permissions_dict["loan:approve"], permissions_dict["loan:disburse"]]
        roles_dict["wealth_manager"].permissions = [permissions_dict["customer:view"], permissions_dict["account:view"], permissions_dict["tx:view"]]
        roles_dict["teller"].permissions = [permissions_dict["tx:deposit"], permissions_dict["tx:withdraw"], permissions_dict["tx:view"]]
        roles_dict["risk_analyst"].permissions = [permissions_dict["fraud:investigate"], permissions_dict["system:diagnostics"]]
        db.flush()

        # ---------------------------------------------------------
        # 2. BRANCHES (>= 10 Branches)
        # ---------------------------------------------------------
        print("[*] Seeding 10 Branches across India...")
        branch_specs = [
            ("BR-DEL-001", "Delhi Connaught Place", "ABMS0001001", "12 Barakhamba Road, Connaught Place", "New Delhi", "Delhi", "110001", "+91 11 2345 6789", "cp.delhi@abmsbank.com"),
            ("BR-BLR-001", "Bengaluru Tech Corridor", "ABMS0002001", "45 Outer Ring Road, Bellandur", "Bengaluru", "Karnataka", "560103", "+91 80 4123 4567", "tech.blr@abmsbank.com"),
            ("BR-MUM-001", "Mumbai Nariman Point", "ABMS0003001", "88 Marine Drive, Nariman Point", "Mumbai", "Maharashtra", "400021", "+91 22 6678 9012", "nariman.mum@abmsbank.com"),
            ("BR-DEL-002", "New Delhi Metro Central", "ABMS0001002", "102 Ring Road, Defence Colony", "New Delhi", "Delhi", "110024", "+91 11 4567 8901", "metro.delhi@abmsbank.com"),
            ("BR-BLR-002", "Bangalore Whitefield", "ABMS0002002", "18 ITPL Main Rd, Whitefield", "Bengaluru", "Karnataka", "560066", "+91 80 8899 1122", "whitefield@abmsbank.com"),
            ("BR-HYD-001", "Hyderabad Hitec City", "ABMS0004001", "7 Cyber Towers Road, Madhapur", "Hyderabad", "Telangana", "500081", "+91 40 3344 5566", "hiteccity@abmsbank.com"),
            ("BR-PUN-001", "Pune Hinjewadi Infotech", "ABMS0005001", "24 Rajiv Gandhi Infotech Park", "Pune", "Maharashtra", "411057", "+91 20 2233 4455", "hinjewadi@abmsbank.com"),
            ("BR-KOL-001", "Kolkata Park Street", "ABMS0006001", "67 Park Street Commercial Plaza", "Kolkata", "West Bengal", "700016", "+91 33 2211 4433", "parkstreet@abmsbank.com"),
            ("BR-CHN-001", "Chennai T Nagar Central", "ABMS0007001", "34 Usman Road, T Nagar", "Chennai", "Tamil Nadu", "600017", "+91 44 2434 5566", "tnagar@abmsbank.com"),
            ("BR-AMD-001", "Ahmedabad SG Highway", "ABMS0008001", "90 SG Highway Commercial Hub", "Ahmedabad", "Gujarat", "380054", "+91 79 2685 1122", "sghighway@abmsbank.com"),
        ]

        branches = []
        for code, name, ifsc, addr, city, state, pc, ph, em in branch_specs:
            br = Branch(branch_code=code, name=name, ifsc_code=ifsc, address=addr, city=city, state=state, postal_code=pc, phone=ph, email=em, is_active=True)
            db.add(br)
            branches.append(br)
        db.flush()

        # ---------------------------------------------------------
        # 3. USERS & EMPLOYEES (>= 10 Employees)
        # ---------------------------------------------------------
        print("[*] Seeding Users & Employees...")
        pwd_admin = get_password_hash("Admin@123")
        pwd_manager = get_password_hash("Manager@123")
        pwd_employee = get_password_hash("Employee@123")
        pwd_customer = get_password_hash("Customer@123")

        # System Administrator
        user_admin = User(username="admin", email="admin@abmsbank.com", password_hash=pwd_admin, role_id=role_admin.id)
        db.add(user_admin)
        db.flush()

        # 10 Branch Managers
        managers = []
        for i, br in enumerate(branches, start=1):
            u_mgr = User(username=f"manager_br{i}", email=f"manager.br{i}@abmsbank.com", password_hash=pwd_manager, role_id=role_manager.id)
            db.add(u_mgr)
            db.flush()
            mgr = Employee(
                user_id=u_mgr.id, branch_id=br.id, employee_code=f"EMP-MGR-{100+i:03d}",
                first_name=f"Manager_{br.city[:3]}", last_name=f"Lead_{i}", designation="Assistant Vice President & Branch Head",
                department="Branch Management", phone=f"+91 98000 100{i:02d}", hire_date=date(2020, 1, 15)
            )
            db.add(mgr)
            managers.append(mgr)
        db.flush()

        # 4 Operational Employees
        staff_data = [
            ("emp_rahul", "Rahul", "Sharma", "Senior KYC & Accounts Officer", branches[0]),
            ("emp_priya", "Priya", "Nair", "Customer Service Lead", branches[0]),
            ("emp_amit", "Amit", "Patel", "Loan Processing Officer", branches[1]),
            ("emp_sneha", "Sneha", "Kulkarni", "Retail Banking Associate", branches[2]),
        ]
        employees = list(managers)
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
        # 4. CUSTOMERS & PROFILES (>= 12 Customers)
        # ---------------------------------------------------------
        print("[*] Seeding 12 Retail Customers...")
        customer_specs = [
            ("alex_turner", "Alex", "Turner", "1992-05-14", "Male", "+91 99001 11001", "alex.turner@example.com", "42 Residency Road", "Bengaluru", "Karnataka", "560025", "ABCDE1234F", "PASSPORT", "P1234567", branches[0]),
            ("sarah_connor", "Sarah", "Connor", "1988-11-20", "Female", "+91 99001 11002", "sarah.connor@example.com", "77 Koramangala 4th Block", "Bengaluru", "Karnataka", "560034", "BCDEF2345G", "DRIVING_LICENSE", "DL9876543", branches[0]),
            ("vikram_singh", "Vikram", "Singh", "1995-03-08", "Male", "+91 99001 11003", "vikram.singh@example.com", "12 Whitefield Main Rd", "Bengaluru", "Karnataka", "560066", "CDEFG3456H", "AADHAAR", "987654321012", branches[1]),
            ("ananya_sharma", "Ananya", "Sharma", "1993-09-15", "Female", "+91 99001 11004", "ananya.sharma@example.com", "88 Ring Road", "New Delhi", "Delhi", "110048", "DEFGH4567I", "PAN_CARD", "DEFGH4567I", branches[2]),
            ("rohit_verma", "Rohit", "Verma", "1990-12-05", "Male", "+91 99001 11005", "rohit.verma@example.com", "15 Nariman Point", "Mumbai", "Maharashtra", "400021", "EFGHI5678J", "PASSPORT", "P7654321", branches[3]),
            ("elena_rostova", "Elena", "Rostova", "1996-07-22", "Female", "+91 99001 11006", "elena.rostova@example.com", "23 MG Road", "Bengaluru", "Karnataka", "560001", "FGHIJ6789K", "DRIVING_LICENSE", "DL5432109", branches[0]),
            ("david_miller", "David", "Miller", "1985-02-18", "Male", "+91 99001 11007", "david.miller@example.com", "102 Defence Colony", "New Delhi", "Delhi", "110024", "GHIJK7890L", "PASSPORT", "P9988776", branches[2]),
            ("meera_nair", "Meera", "Nair", "1998-08-30", "Female", "+91 99001 11008", "meera.nair@example.com", "55 Bandra West", "Mumbai", "Maharashtra", "400050", "HIJKL8901M", "AADHAAR", "432187650987", branches[3]),
            ("arjun_kapoor", "Arjun", "Kapoor", "1991-04-12", "Male", "+91 99001 11009", "arjun.kapoor@example.com", "19 Hitec City Ph 2", "Hyderabad", "Telangana", "500081", "IJKLM9012N", "PAN_CARD", "IJKLM9012N", branches[5]),
            ("kavita_reddy", "Kavita", "Reddy", "1994-10-25", "Female", "+91 99001 11010", "kavita.reddy@example.com", "88 Jubilee Hills", "Hyderabad", "Telangana", "500033", "JKLMN0123O", "PASSPORT", "P3344556", branches[5]),
            ("suresh_patel", "Suresh", "Patel", "1982-01-19", "Male", "+91 99001 11011", "suresh.patel@example.com", "401 SG Highway", "Ahmedabad", "Gujarat", "380054", "KLMNO1234P", "AADHAAR", "778899001122", branches[9]),
            ("pooja_deshmukh", "Pooja", "Deshmukh", "1997-06-14", "Female", "+91 99001 11012", "pooja.deshmukh@example.com", "12 Hinjewadi Phase 1", "Pune", "Maharashtra", "411057", "LMNOP2345Q", "DRIVING_LICENSE", "DL6677889", branches[6]),
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
            account_type="CHECKING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        sys_withdrawal = Account(
            account_number="SYS-CLEARING-WITHDRAWAL",
            customer_id=None, branch_id=branches[0].id,
            account_type="CHECKING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        sys_loan_disb = Account(
            account_number="SYS-LOAN-DISBURSEMENT",
            customer_id=None, branch_id=branches[0].id,
            account_type="CHECKING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        sys_loan_settle = Account(
            account_number="SYS-LOAN-SETTLEMENT",
            customer_id=None, branch_id=branches[0].id,
            account_type="CHECKING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        sys_interest_inc = Account(
            account_number="SYS-INTEREST-INCOME",
            customer_id=None, branch_id=branches[0].id,
            account_type="CHECKING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        sys_interest_exp = Account(
            account_number="SYS-INTEREST-EXPENSE",
            customer_id=None, branch_id=branches[0].id,
            account_type="CHECKING", balance=Decimal("0.0000"),
            currency="INR", status="ACTIVE", is_system_account=True
        )
        db.add_all([sys_deposit, sys_withdrawal, sys_loan_disb, sys_loan_settle, sys_interest_inc, sys_interest_exp])
        db.flush()

        # ---------------------------------------------------------
        # 6. CUSTOMER ACCOUNTS & CARDS (>= 12 Accounts & Cards)
        # ---------------------------------------------------------
        print("[*] Seeding Customer Accounts & Cards...")
        initial_balances = [
            Decimal("5000.0000"),   # Alex (Primary Concurrency Test Subject: exactly 5000)
            Decimal("75000.0000"),  # Sarah
            Decimal("150000.0000"), # Vikram
            Decimal("95000.0000"),  # Ananya
            Decimal("280000.0000"), # Rohit
            Decimal("45000.0000"),  # Elena
            Decimal("120000.0000"), # David
            Decimal("65000.0000"),  # Meera
            Decimal("180000.0000"), # Arjun
            Decimal("110000.0000"), # Kavita
            Decimal("310000.0000"), # Suresh
            Decimal("85000.0000"),  # Pooja
        ]

        cust_accounts = []
        for i, cust in enumerate(customers):
            acc = Account(
                account_number=f"1000{202600+i:06d}",
                customer_id=cust.id,
                branch_id=cust.branch_id,
                account_type="SAVINGS",
                balance=Decimal("0.0000"),
                currency="INR",
                status="ACTIVE",
                is_system_account=False
            )
            db.add(acc)
            cust_accounts.append(acc)
        db.flush()

        # Additional Checking accounts for Alex, Rohit, Arjun, Suresh
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
        rohit_checking = Account(
            account_number="2000202602",
            customer_id=customers[4].id,
            branch_id=customers[4].branch_id,
            account_type="CHECKING",
            balance=Decimal("0.0000"),
            currency="INR",
            status="ACTIVE",
            is_system_account=False
        )
        db.add_all([alex_checking, rohit_checking])
        db.flush()

        # Issue Cards for Customers (12 Cards)
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
        # 7. BENEFICIARIES (>= 12 Beneficiaries)
        # ---------------------------------------------------------
        print("[*] Seeding 12 Beneficiaries...")
        beneficiaries = [
            Beneficiary(customer_id=customers[0].id, beneficiary_name="Sarah Connor", account_number=cust_accounts[1].account_number, ifsc_code=branches[0].ifsc_code, bank_name="ABMS Bank Downtown", daily_limit=Decimal("100000.00")),
            Beneficiary(customer_id=customers[0].id, beneficiary_name="Vikram Singh", account_number=cust_accounts[2].account_number, ifsc_code=branches[1].ifsc_code, bank_name="ABMS Bank Tech Corridor", daily_limit=Decimal("50000.00")),
            Beneficiary(customer_id=customers[0].id, beneficiary_name="Elena Rostova", account_number=cust_accounts[5].account_number, ifsc_code=branches[0].ifsc_code, bank_name="ABMS Bank MG Road", daily_limit=Decimal("100000.00")),
            Beneficiary(customer_id=customers[1].id, beneficiary_name="Alex Turner", account_number=cust_accounts[0].account_number, ifsc_code=branches[0].ifsc_code, bank_name="ABMS Bank Downtown", daily_limit=Decimal("100000.00")),
            Beneficiary(customer_id=customers[2].id, beneficiary_name="Ananya Sharma", account_number=cust_accounts[3].account_number, ifsc_code=branches[2].ifsc_code, bank_name="ABMS Bank Metro Central", daily_limit=Decimal("150000.00")),
            Beneficiary(customer_id=customers[4].id, beneficiary_name="David Miller", account_number=cust_accounts[6].account_number, ifsc_code=branches[2].ifsc_code, bank_name="ABMS Bank Metro Central", daily_limit=Decimal("200000.00")),
            Beneficiary(customer_id=customers[5].id, beneficiary_name="Alex Turner", account_number=cust_accounts[0].account_number, ifsc_code=branches[0].ifsc_code, bank_name="ABMS Bank Downtown", daily_limit=Decimal("100000.00")),
            Beneficiary(customer_id=customers[6].id, beneficiary_name="Rohit Verma", account_number=cust_accounts[4].account_number, ifsc_code=branches[3].ifsc_code, bank_name="ABMS Bank Nariman Point", daily_limit=Decimal("150000.00")),
            Beneficiary(customer_id=customers[7].id, beneficiary_name="Meera Nair", account_number=cust_accounts[7].account_number, ifsc_code=branches[3].ifsc_code, bank_name="ABMS Bank Nariman Point", daily_limit=Decimal("80000.00")),
            Beneficiary(customer_id=customers[8].id, beneficiary_name="Kavita Reddy", account_number=cust_accounts[9].account_number, ifsc_code=branches[5].ifsc_code, bank_name="ABMS Bank Hitec City", daily_limit=Decimal("120000.00")),
            Beneficiary(customer_id=customers[9].id, beneficiary_name="Arjun Kapoor", account_number=cust_accounts[8].account_number, ifsc_code=branches[5].ifsc_code, bank_name="ABMS Bank Hitec City", daily_limit=Decimal("120000.00")),
            Beneficiary(customer_id=customers[10].id, beneficiary_name="Pooja Deshmukh", account_number=cust_accounts[11].account_number, ifsc_code=branches[6].ifsc_code, bank_name="ABMS Bank Hinjewadi", daily_limit=Decimal("100000.00")),
        ]
        db.add_all(beneficiaries)
        db.flush()

        # ---------------------------------------------------------
        # 8. INITIAL FUNDING VIA DOUBLE-ENTRY TRANSACTIONS
        # ---------------------------------------------------------
        print("[*] Executing Double-Entry Ledger Transactions for Initial Funding...")
        for i, acc in enumerate(cust_accounts):
            fund_amount = initial_balances[i]
            acc.balance = fund_amount
            sys_deposit.balance -= fund_amount

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

        # Funding Alex checking account (₹25,000)
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
        # 9. LOANS & AMORTIZATION (>= 10 Loans, Installments & Payments)
        # ---------------------------------------------------------
        print("[*] Seeding 10 Loans with Full Amortization Schedules & Payments...")
        loan_types = ["PERSONAL", "HOME", "AUTO", "BUSINESS", "PERSONAL", "HOME", "AUTO", "BUSINESS", "PERSONAL", "HOME"]
        loan_amounts = [
            Decimal("50000.0000"), Decimal("80000.0000"), Decimal("60000.0000"), Decimal("70000.0000"),
            Decimal("90000.0000"), Decimal("40000.0000"), Decimal("30000.0000"), Decimal("45000.0000"),
            Decimal("85000.0000"), Decimal("55000.0000")
        ]
        rates = [Decimal("10.00"), Decimal("8.50"), Decimal("9.20"), Decimal("10.50"), Decimal("11.00"), Decimal("9.50"), Decimal("10.00"), Decimal("9.50"), Decimal("8.75"), Decimal("10.00")]

        loans = []
        all_installments = []
        all_payments = []

        for i in range(10):
            cust = customers[i % len(customers)]
            acc = cust_accounts[i % len(cust_accounts)]
            p_amount = loan_amounts[i]
            annual_rate = rates[i]
            tenure = 24
            monthly_rate = (annual_rate / Decimal("100")) / Decimal("12")
            r_float = float(monthly_rate)
            emi_float = float(p_amount) * (r_float * (1 + r_float)**tenure) / ((1 + r_float)**tenure - 1)
            monthly_emi = Decimal(str(round(emi_float, 4)))

            loan = Loan(
                loan_number=f"LN-2026-00{101+i}",
                customer_id=cust.id,
                branch_id=cust.branch_id,
                disbursement_account_id=acc.id,
                loan_type=loan_types[i],
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
                approved_by_employee_id=managers[i % len(managers)].id
            )
            db.add(loan)
            loans.append(loan)
        db.flush()

        # Generate Installments and at least 1 payment for each loan (10+ payments)
        start_due_date = date.today() - timedelta(days=45)
        for idx, loan in enumerate(loans):
            remaining_balance = loan.principal_amount
            monthly_rate = (loan.annual_interest_rate / Decimal("100")) / Decimal("12")

            for num in range(1, 13):
                interest_comp = round(remaining_balance * monthly_rate, 4)
                principal_comp = round(loan.monthly_emi - interest_comp, 4)
                if num == 12:
                    principal_comp = remaining_balance
                    emi_val = principal_comp + interest_comp
                else:
                    emi_val = loan.monthly_emi

                remaining_balance -= principal_comp
                due_d = start_due_date + timedelta(days=30 * (num - 1))
                # Leave Alex Turner's installments PENDING so Alex starts fresh with ₹5,000 balance
                is_paid = (num == 1 and loan.customer_id != customers[0].id)

                inst = LoanInstallment(
                    loan_id=loan.id,
                    installment_number=num,
                    due_date=due_d,
                    principal_component=principal_comp,
                    interest_component=interest_comp,
                    total_amount=emi_val,
                    status="PAID" if is_paid else "PENDING",
                    paid_at=datetime.combine(due_d + timedelta(days=2), datetime.min.time()) if is_paid else None
                )
                db.add(inst)
                db.flush()
                all_installments.append(inst)

                if is_paid:
                    # Deduct from disbursement account to maintain perfect ledger parity
                    repay_acc = db.query(Account).filter(Account.id == loan.disbursement_account_id).first()
                    repay_acc.balance -= inst.total_amount
                    sys_loan_settle.balance += inst.total_amount

                    # Record payment transaction & loan payment row
                    tx_pay = Transaction(
                        reference_no=f"TXN-LNPAY-{loan.id:03d}-{num:02d}",
                        idempotency_key=f"IDEMP-LNPAY-{loan.id}-{num}",
                        source_account_id=loan.disbursement_account_id,
                        destination_account_id=sys_loan_settle.id,
                        amount=inst.total_amount,
                        currency="INR",
                        transaction_type="LOAN_REPAYMENT",
                        status="COMPLETED",
                        description=f"EMI repayment installment #{num} for loan {loan.loan_number}",
                        created_at=datetime.utcnow() - timedelta(days=15),
                        completed_at=datetime.utcnow() - timedelta(days=15)
                    )
                    db.add(tx_pay)
                    db.flush()

                    db.add_all([
                        LedgerEntry(transaction_id=tx_pay.id, account_id=loan.disbursement_account_id, entry_type="DEBIT", amount=inst.total_amount, balance_after=repay_acc.balance, posted_at=tx_pay.created_at),
                        LedgerEntry(transaction_id=tx_pay.id, account_id=sys_loan_settle.id, entry_type="CREDIT", amount=inst.total_amount, balance_after=sys_loan_settle.balance, posted_at=tx_pay.created_at)
                    ])

                    loan.outstanding_principal -= inst.principal_component
                    payment = LoanPayment(
                        loan_id=loan.id,
                        installment_id=inst.id,
                        transaction_id=tx_pay.id,
                        amount_paid=inst.total_amount,
                        principal_paid=inst.principal_component,
                        interest_paid=inst.interest_component,
                        payment_date=datetime.utcnow() - timedelta(days=15)
                    )
                    db.add(payment)
                    all_payments.append(payment)
        db.flush()

        # Seed a suspicious high-value transfer for fraud-dashboard demonstrations.
        fraud_transfer_amount = Decimal("120000.0000")
        fraud_source_acc = cust_accounts[2]  # Vikram Singh
        fraud_destination_acc = cust_accounts[3]  # Ananya Sharma
        fraud_source_acc.balance -= fraud_transfer_amount
        fraud_destination_acc.balance += fraud_transfer_amount
        fraud_tx = Transaction(
            reference_no="TXN-FRD-2026103",
            idempotency_key="IDEMP-FRD-VIKRAM-ANANYA-120000",
            source_account_id=fraud_source_acc.id,
            destination_account_id=fraud_destination_acc.id,
            amount=fraud_transfer_amount,
            currency="INR",
            transaction_type="TRANSFER",
            status="COMPLETED",
            description="High-value transfer flagged for unusual amount and velocity",
            created_at=datetime.utcnow() - timedelta(days=1),
            completed_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add(fraud_tx)
        db.flush()
        db.add_all([
            LedgerEntry(
                transaction_id=fraud_tx.id,
                account_id=fraud_source_acc.id,
                entry_type="DEBIT",
                amount=fraud_transfer_amount,
                balance_after=fraud_source_acc.balance,
                posted_at=fraud_tx.created_at
            ),
            LedgerEntry(
                transaction_id=fraud_tx.id,
                account_id=fraud_destination_acc.id,
                entry_type="CREDIT",
                amount=fraud_transfer_amount,
                balance_after=fraud_destination_acc.balance,
                posted_at=fraud_tx.created_at
            )
        ])
        db.flush()

        # ---------------------------------------------------------
        # 10. FRAUD ALERTS (>= 10 Rows)
        # ---------------------------------------------------------
        print("[*] Seeding 10 Real-World Fraud Alerts...")
        fraud_alert_specs = [
            ("ALT-2026-0091", cust_accounts[0].id, customers[0].id, 78, "HIGH", "CIRCULAR_TRANSFER_SUSPECT", "Rapid multi-hop funds movement matching circular topology pattern.", "UNDER_INVESTIGATION"),
            ("ALT-2026-0092", cust_accounts[4].id, customers[4].id, 45, "MEDIUM", "SHARED_DEVICE_ACCESS", "Account logged in from device previously associated with multiple distinct customer profiles.", "NEW"),
            ("ALT-2026-0093", cust_accounts[1].id, customers[1].id, 88, "HIGH", "VELOCITY_SPIKE", "Exceeded 5 outbound transactions within a 10-minute surveillance window.", "UNDER_INVESTIGATION"),
            ("ALT-2026-0094", cust_accounts[2].id, customers[2].id, 92, "CRITICAL", "SPIKE_AMOUNT", "Single transaction amount of ₹1,50,000 is 4.8x higher than the 30-day customer historical average.", "NEW"),
            ("ALT-2026-0095", cust_accounts[3].id, customers[3].id, 70, "HIGH", "NEW_BENEFICIARY_LARGE_TRANSFER", "High-value transfer of ₹75,000 sent to payee added within the last 2 hours.", "UNDER_INVESTIGATION"),
            ("ALT-2026-0096", cust_accounts[5].id, customers[5].id, 30, "LOW", "UNUSUAL_HOURS_ACCESS", "Portal access initiated during non-standard hours (03:42 AM IST) from unknown user agent.", "RESOLVED"),
            ("ALT-2026-0097", cust_accounts[6].id, customers[6].id, 85, "HIGH", "MULTI_IP_LOGIN_BURST", "Successful session authenticated from two geographically distant IP addresses within 15 minutes.", "UNDER_INVESTIGATION"),
            ("ALT-2026-0098", cust_accounts[7].id, customers[7].id, 25, "LOW", "PASSWORD_CHANGE_FOLLOWED_BY_TRANSFER", "Funds transfer executed immediately following credential reset event.", "RESOLVED"),
            ("ALT-2026-0099", cust_accounts[8].id, customers[8].id, 96, "CRITICAL", "CIRCULAR_TRANSFER_RING", "Multi-account graph path traversal confirmed closed cycle funds recycling back to origin.", "UNDER_INVESTIGATION"),
            ("ALT-2026-0100", cust_accounts[9].id, customers[9].id, 40, "MEDIUM", "RAPID_CARD_LIMIT_MODIFICATION", "Daily POS limit increased to maximum threshold and immediately utilized.", "FALSE_POSITIVE"),
            ("ALT-2026-0101", fraud_source_acc.id, customers[2].id, 97, "CRITICAL", "SUSPICIOUS_HIGH_VALUE_TRANSFER", "Transaction TXN-FRD-2026103 moved ₹1,20,000 to a new counterparty and exceeded the customer's normal transfer profile.", "UNDER_INVESTIGATION"),
        ]

        for code, acc_id, cust_id, score, sev, atype, desc, stat in fraud_alert_specs:
            fa = FraudAlert(
                alert_code=code, account_id=acc_id, customer_id=cust_id,
                risk_score=score, severity=sev, alert_type=atype,
                description=desc, status=stat,
                investigated_by_employee_id=employees[0].id if stat != "NEW" else None,
                investigation_notes="Automated rule flag generated by ABMS surveillance daemon." if stat != "NEW" else None
            )
            db.add(fa)
        db.flush()

        # ---------------------------------------------------------
        # 11. NOTIFICATIONS (>= 12 Rows)
        # ---------------------------------------------------------
        print("[*] Seeding 12 User Notifications...")
        notif_specs = [
            (customers[0].user_id, "Welcome to ABMS Bank", "Your online banking portal has been provisioned with cryptographic ledger security.", "SYSTEM", True),
            (customers[0].user_id, "Transfer Sent", "₹1,500.00 transferred to Sarah Connor. Ref: TXN-XFR-2026101", "TRANSFER_SENT", True),
            (customers[0].user_id, "Cash Withdrawal", "₹1,500.00 withdrawn from ATM. Ref: TXN-WDL-2026102", "SYSTEM", True),
            (customers[1].user_id, "Money Received", "₹1,500.00 received from Sarah Connor. Ref: TXN-XFR-2026101", "TRANSFER_RECEIVED", False),
            (customers[2].user_id, "Loan Disbursed", "Loan LN-2026-00101 funds of ₹2,00,000 have been credited to your account.", "LOAN_DISBURSED", True),
            (customers[2].user_id, "EMI Payment Received", "EMI payment for installment #1 of ₹17,769.75 received successfully.", "TRANSFER_RECEIVED", False),
            (customers[3].user_id, "KYC Verified", "Your KYC profile documentation has been successfully verified by our branch team.", "SYSTEM", True),
            (customers[4].user_id, "Security Alert", "New login detected from a new browser session.", "FRAUD_ALERT", False),
            (customers[5].user_id, "Savings Interest Credited", "Monthly savings interest of ₹148.50 has been credited to your account.", "TRANSFER_RECEIVED", False),
            (user_admin.id, "System Diagnostics Status", "Automated daily ledger balance reconciliation check passed with 0 discrepancies.", "SYSTEM", True),
            (user_admin.id, "Critical Fraud Alert", "High-risk circular money ring flagged for Account 1000202600.", "FRAUD_ALERT", False),
            (managers[0].user_id, "Branch Monthly Targets", "Delhi Connaught Place achieved 104% of deposit target this month.", "SYSTEM", False),
        ]

        for uid, tit, msg, ntype, read in notif_specs:
            notif = Notification(user_id=uid, title=tit, message=msg, type=ntype, is_read=read, created_at=datetime.utcnow() - timedelta(hours=8))
            db.add(notif)
        db.flush()

        # ---------------------------------------------------------
        # 12. OUTBOX EVENTS (>= 10 Rows)
        # ---------------------------------------------------------
        print("[*] Seeding Outbox Events for Async Event Sourcing...")
        for i in range(12):
            oe = OutboxEvent(
                event_id=f"EVT-OUTBOX-{202600+i}",
                event_type="FINANCIAL_TRANSFER_COMPLETED",
                aggregate_type="Transaction",
                aggregate_id=str(i + 1),
                payload={"reference_no": f"TXN-OUTBOX-{i+1}", "amount": 1000.0 * (i + 1)},
                status="PROCESSED" if i < 10 else "PENDING",
                retry_count=0
            )
            db.add(oe)
        db.flush()

        # ---------------------------------------------------------
        # 13. CRYPTOGRAPHIC AUDIT LOGS (SHA-256 Hash Chained >= 10 Rows)
        # ---------------------------------------------------------
        print("[*] Creating 10 Cryptographically Hash-Chained Audit Logs...")
        genesis_hash = "0" * 64
        audit_events = [
            ("system", "SYSTEM_INIT", "Database", "bank_management", {"event": "System initialized and tables created"}, "127.0.0.1"),
            ("admin", "USER_ROLE_ASSIGN", "User", "admin", {"role": "admin", "action": "Assigned superadmin privileges"}, "127.0.0.1"),
            ("employee", "CUSTOMER_KYC_VERIFY", "Customer", "CUST-20260001", {"status": "VERIFIED", "officer": "emp_rahul"}, "192.168.1.10"),
            ("customer", "MONEY_TRANSFER", "Transaction", "TXN-XFR-2026101", {"from": "sarah_connor", "to": "alex_turner", "amount": 1500.0}, "192.168.1.55"),
            ("branch_manager", "LOAN_APPROVAL", "Loan", "LN-2026-00101", {"status": "APPROVED", "principal": 200000.0}, "192.168.1.100"),
            ("branch_manager", "LOAN_DISBURSEMENT", "Loan", "LN-2026-00101", {"disbursed_to": "1000202602", "amount": 200000.0}, "192.168.1.100"),
            ("customer", "CARD_STATUS_UPDATE", "Card", "1", {"is_blocked": False, "reason": "Active"}, "192.168.1.55"),
            ("employee", "CUSTOMER_REGISTRATION", "Customer", "CUST-20260012", {"name": "Pooja Deshmukh"}, "192.168.1.15"),
            ("admin", "CACHE_PURGE", "System", "Redis", {"keys_cleared": 4}, "127.0.0.1"),
            ("system", "RECONCILIATION_RUN", "Ledger", "ALL_ACCOUNTS", {"status": "BALANCED", "discrepancies": 0}, "127.0.0.1"),
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

        db.commit()
        print("[+] MySQL Relational Database successfully seeded with >= 10 rows in all tables!")

        # ---------------------------------------------------------
        # 14. MONGODB FRAUD GRAPH & ANALYTICS SEEDING
        # ---------------------------------------------------------
        print("[*] Seeding MongoDB Fraud Graph & Security Events...")
        try:
            mongo = get_mongo_db()
            mongo.fraud_graph_nodes.delete_many({})
            mongo.fraud_graph_edges.delete_many({})
            mongo.activity_logs.delete_many({})
            mongo.security_events.delete_many({})

            nodes = [
                {"node_id": "ACC_ALEX", "node_type": "ACCOUNT", "account_number": cust_accounts[0].account_number, "customer_name": "Alex Turner", "risk_score": 75},
                {"node_id": "ACC_SARAH", "node_type": "ACCOUNT", "account_number": cust_accounts[1].account_number, "customer_name": "Sarah Connor", "risk_score": 20},
                {"node_id": "ACC_VIKRAM", "node_type": "ACCOUNT", "account_number": cust_accounts[2].account_number, "customer_name": "Vikram Singh", "risk_score": 15},
                {"node_id": "ACC_ANANYA", "node_type": "ACCOUNT", "account_number": cust_accounts[3].account_number, "customer_name": "Ananya Sharma", "risk_score": 10},
                {"node_id": "ACC_ROHIT", "node_type": "ACCOUNT", "account_number": cust_accounts[4].account_number, "customer_name": "Rohit Verma", "risk_score": 85},
                {"node_id": "ACC_ELENA", "node_type": "ACCOUNT", "account_number": cust_accounts[5].account_number, "customer_name": "Elena Rostova", "risk_score": 35},
                {"node_id": "ACC_DAVID", "node_type": "ACCOUNT", "account_number": cust_accounts[6].account_number, "customer_name": "David Miller", "risk_score": 25},
                {"node_id": "ACC_MEERA", "node_type": "ACCOUNT", "account_number": cust_accounts[7].account_number, "customer_name": "Meera Nair", "risk_score": 18},
                {"node_id": "ACC_MULE_1", "node_type": "ACCOUNT", "account_number": "8888001010", "customer_name": "Relay Mule 1", "risk_score": 92},
                {"node_id": "ACC_MULE_2", "node_type": "ACCOUNT", "account_number": "8888001020", "customer_name": "Relay Mule 2", "risk_score": 90},
                {"node_id": "DEV_SUSPECT_01", "node_type": "DEVICE", "device_fingerprint": "DEV-MAC-B8-27-EB-9A", "device_type": "Linux Workstation", "risk_score": 95},
                {"node_id": "IP_SUSPECT_VPN", "node_type": "IP_ADDRESS", "ip_address": "198.51.100.45", "isp": "Datacenter VPN Host", "risk_score": 88},
            ]
            mongo.fraud_graph_nodes.insert_many(nodes)

            edges = [
                {"from_node": "ACC_ALEX", "to_node": "ACC_MULE_1", "edge_type": "TRANSACTED_WITH", "amount": 45000.0, "tx_count": 4, "created_at": datetime.utcnow() - timedelta(days=2)},
                {"from_node": "ACC_MULE_1", "to_node": "ACC_MULE_2", "edge_type": "TRANSACTED_WITH", "amount": 44500.0, "tx_count": 3, "created_at": datetime.utcnow() - timedelta(days=1, hours=18)},
                {"from_node": "ACC_MULE_2", "to_node": "ACC_ROHIT", "edge_type": "TRANSACTED_WITH", "amount": 44000.0, "tx_count": 2, "created_at": datetime.utcnow() - timedelta(days=1, hours=10)},
                {"from_node": "ACC_ROHIT", "to_node": "ACC_ALEX", "edge_type": "TRANSACTED_WITH", "amount": 43500.0, "tx_count": 2, "created_at": datetime.utcnow() - timedelta(hours=8)},
                {"from_node": "ACC_MULE_1", "to_node": "DEV_SUSPECT_01", "edge_type": "USED_DEVICE", "login_count": 14, "created_at": datetime.utcnow() - timedelta(days=3)},
                {"from_node": "ACC_MULE_2", "to_node": "DEV_SUSPECT_01", "edge_type": "USED_DEVICE", "login_count": 9, "created_at": datetime.utcnow() - timedelta(days=3)},
                {"from_node": "ACC_ROHIT", "to_node": "DEV_SUSPECT_01", "edge_type": "USED_DEVICE", "login_count": 21, "created_at": datetime.utcnow() - timedelta(days=2)},
                {"from_node": "ACC_MULE_1", "to_node": "IP_SUSPECT_VPN", "edge_type": "CONNECTED_IP", "session_count": 12, "created_at": datetime.utcnow() - timedelta(days=3)},
                {"from_node": "ACC_MULE_2", "to_node": "IP_SUSPECT_VPN", "edge_type": "CONNECTED_IP", "session_count": 8, "created_at": datetime.utcnow() - timedelta(days=3)},
                {"from_node": "ACC_SARAH", "to_node": "ACC_ALEX", "edge_type": "TRANSACTED_WITH", "amount": 1500.0, "tx_count": 1, "created_at": datetime.utcnow() - timedelta(days=5)},
                {"from_node": "ACC_VIKRAM", "to_node": "ACC_SARAH", "edge_type": "TRANSACTED_WITH", "amount": 2500.0, "tx_count": 1, "created_at": datetime.utcnow() - timedelta(days=8)}
            ]
            mongo.fraud_graph_edges.insert_many(edges)

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
        # 15. WARM UP REDIS CACHE
        # ---------------------------------------------------------
        print("[*] Warming up Redis Cache...")
        try:
            cache_manager.set("bank:system:status", "OPERATIONAL", ex=3600)
            cache_manager.set(f"bank:branch:kpi:{branches[0].id}", '{"branch":"Delhi Connaught Place","status":"active"}', ex=300)
            print("[+] Redis Cache initialized and warmed.")
        except Exception as e:
            print(f"[-] Redis cache note: {e}")

        print("\n=======================================================")
        print(" [SUCCESS] Seeding Completed! ALL tables now have >= 10 records.")
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
