import logging
import uuid
from datetime import datetime, timedelta, date
from decimal import Decimal
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import SessionLocal
from backend.app.models import Account, Transaction, LedgerEntry, LoanInstallment, Customer, Branch
from backend.app.services.notification_service import send_notification

logger = logging.getLogger("abms.scheduler")

scheduler = AsyncIOScheduler()

def get_or_create_system_account(db: Session, account_number: str, branch_id: int = 1) -> Account:
    sys_acc = db.query(Account).filter(Account.account_number == account_number).first()
    if not sys_acc:
        branch = db.query(Branch).first()
        b_id = branch.id if branch else branch_id
        sys_acc = Account(
            account_number=account_number,
            branch_id=b_id,
            customer_id=None,
            account_type="CHECKING",
            balance=Decimal("0.0000"),
            currency="INR",
            status="ACTIVE",
            is_system_account=True
        )
        db.add(sys_acc)
        db.flush()
    return sys_acc


def execute_interest_credit_job(db: Session) -> dict:
    """
    Monthly savings interest calculation: 4% p.a. monthly interest.
    Double-entry: Debit SYS-INTEREST-EXPENSE, Credit customer SAVINGS account.
    """
    sys_exp_acc = get_or_create_system_account(db, "SYS-INTEREST-EXPENSE")
    
    # Active savings accounts with positive balance
    savings_accounts = db.query(Account).filter(
        Account.account_type == "SAVINGS",
        Account.status == "ACTIVE",
        Account.is_system_account == False,
        Account.balance > Decimal("0.0000")
    ).all()

    processed_count = 0
    total_interest_credited = Decimal("0.0000")

    for acc in savings_accounts:
        monthly_rate = Decimal("0.04") / Decimal(12)
        interest_amt = round(acc.balance * monthly_rate, 2)
        if interest_amt < Decimal("0.01"):
            continue

        first_id, second_id = sorted([sys_exp_acc.id, acc.id])
        locked_accs = {
            a.id: a for a in db.query(Account).filter(Account.id.in_([first_id, second_id])).with_for_update().all()
        }
        l_sys = locked_accs[sys_exp_acc.id]
        l_cust = locked_accs[acc.id]

        l_sys.balance -= interest_amt
        l_cust.balance += interest_amt
        l_sys.version += 1
        l_cust.version += 1

        tx = Transaction(
            reference_no=f"INT-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:8].upper()}",
            source_account_id=l_sys.id,
            destination_account_id=l_cust.id,
            amount=interest_amt,
            currency="INR",
            transaction_type="INTEREST_CREDIT",
            status="COMPLETED",
            description=f"Monthly savings interest credited @ 4% p.a.",
            completed_at=datetime.utcnow()
        )
        db.add(tx)
        db.flush()

        le_dr = LedgerEntry(
            transaction_id=tx.id,
            account_id=l_sys.id,
            entry_type="DEBIT",
            amount=interest_amt,
            balance_after=l_sys.balance,
            posted_at=datetime.utcnow()
        )
        le_cr = LedgerEntry(
            transaction_id=tx.id,
            account_id=l_cust.id,
            entry_type="CREDIT",
            amount=interest_amt,
            balance_after=l_cust.balance,
            posted_at=datetime.utcnow()
        )
        db.add_all([le_dr, le_cr])

        # Notify customer
        if l_cust.customer and l_cust.customer.user_id:
            send_notification(
                db=db,
                user_id=l_cust.customer.user_id,
                title="Savings Interest Credited",
                message=f"Interest of ₹{interest_amt:,.2f} has been credited to your account {l_cust.account_number}.",
                notification_type="TRANSFER_RECEIVED"
            )

        processed_count += 1
        total_interest_credited += interest_amt

    db.commit()
    logger.info(f"[Scheduler] Interest credit job completed: {processed_count} accounts credited, total ₹{total_interest_credited}")
    return {"processed_accounts": processed_count, "total_interest_credited": float(total_interest_credited)}


def execute_mark_overdue_job(db: Session) -> dict:
    """
    Mark overdue loan installments where due_date < current_date and status = 'PENDING'.
    """
    today = date.today()
    overdue_installments = db.query(LoanInstallment).filter(
        LoanInstallment.status == "PENDING",
        LoanInstallment.due_date < today
    ).all()

    count = 0
    for inst in overdue_installments:
        inst.status = "OVERDUE"
        count += 1
        loan = inst.loan
        if loan and loan.customer and loan.customer.user_id:
            send_notification(
                db=db,
                user_id=loan.customer.user_id,
                title="Loan Installment Overdue Notice",
                message=f"Installment #{inst.installment_number} of ₹{inst.total_installment:,.2f} for loan {loan.loan_number} was due on {inst.due_date} and is now marked OVERDUE.",
                notification_type="SYSTEM"
            )

    db.commit()
    logger.info(f"[Scheduler] Mark overdue job completed: {count} installments marked OVERDUE.")
    return {"marked_overdue_count": count}


def execute_mark_dormant_job(db: Session) -> dict:
    """
    Mark accounts DORMANT if no transaction in past 180 days.
    """
    cutoff = datetime.utcnow() - timedelta(days=180)
    
    # Query accounts that are ACTIVE and non-system
    accounts = db.query(Account).filter(
        Account.status == "ACTIVE",
        Account.is_system_account == False
    ).all()

    count = 0
    for acc in accounts:
        # Check latest ledger entry
        last_entry = db.query(LedgerEntry).filter(LedgerEntry.account_id == acc.id).order_by(LedgerEntry.posted_at.desc()).first()
        if last_entry:
            if last_entry.posted_at < cutoff:
                acc.status = "DORMANT"
                acc.version += 1
                count += 1
        elif acc.created_at < cutoff:
            acc.status = "DORMANT"
            acc.version += 1
            count += 1

    db.commit()
    logger.info(f"[Scheduler] Mark dormant job completed: {count} accounts marked DORMANT.")
    return {"marked_dormant_count": count}


def scheduled_interest_job():
    with SessionLocal() as db:
        execute_interest_credit_job(db)

def scheduled_overdue_job():
    with SessionLocal() as db:
        execute_mark_overdue_job(db)

def scheduled_dormant_job():
    with SessionLocal() as db:
        execute_mark_dormant_job(db)


def start_scheduler():
    """Start APScheduler jobs."""
    try:
        if not scheduler.running:
            # Run interest job on the 1st day of every month at midnight
            scheduler.add_job(scheduled_interest_job, 'cron', day=1, hour=0, minute=0, id='monthly_interest_job', replace_existing=True)
            # Run overdue installment check daily at 01:00 AM
            scheduler.add_job(scheduled_overdue_job, 'cron', hour=1, minute=0, id='daily_overdue_job', replace_existing=True)
            # Run dormant account check daily at 02:00 AM
            scheduler.add_job(scheduled_dormant_job, 'cron', hour=2, minute=0, id='daily_dormant_job', replace_existing=True)
            scheduler.start()
            logger.info("[Scheduler] APScheduler started successfully.")
    except Exception as e:
        logger.warning(f"[Scheduler] Failed to start APScheduler: {e}")
