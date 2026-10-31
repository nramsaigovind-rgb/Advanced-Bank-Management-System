import os
import sys
import json
from decimal import Decimal
from datetime import datetime, date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.app.core.database import SessionLocal
from sqlalchemy import text

tables = [
    'roles', 'permissions', 'role_permissions', 'branches', 'employees',
    'users', 'customers', 'accounts', 'cards', 'beneficiaries',
    'transactions', 'ledger_entries', 'loans', 'loan_installments',
    'loan_payments', 'fraud_alerts', 'outbox_events', 'notifications', 'audit_logs'
]

def sql_quote(val):
    if val is None:
        return 'NULL'
    if isinstance(val, bool):
        return '1' if val else '0'
    if isinstance(val, (int, float, Decimal)):
        return str(val)
    if isinstance(val, (datetime, date)):
        return f"'{val}'"
    if isinstance(val, (dict, list)):
        escaped = json.dumps(val).replace("'", "''")
        return f"'{escaped}'"
    s = str(val).replace("'", "''")
    return f"'{s}'"

with SessionLocal() as db, open('database/scripts/seed_10_records.sql', 'w', encoding='utf-8') as f:
    f.write('-- ========================================================================\n')
    f.write('-- ABMS BANK: Comprehensive Seed Data (>= 10 records in all tables)\n')
    f.write('-- Generated for Academic DBMS Laboratory & Production Demonstrations\n')
    f.write('-- ========================================================================\n\n')
    f.write('SET FOREIGN_KEY_CHECKS = 0;\n\n')
    
    for t in tables:
        f.write(f'-- Table: {t}\n')
        rows = db.execute(text(f'SELECT * FROM {t}')).mappings().all()
        if rows:
            cols = list(rows[0].keys())
            col_str = ', '.join([f'`{c}`' for c in cols])
            f.write(f'INSERT INTO `{t}` ({col_str}) VALUES\n')
            val_lines = []
            for r in rows:
                vals = [sql_quote(r[c]) for c in cols]
                val_lines.append(f"  ({', '.join(vals)})")
            f.write(',\n'.join(val_lines) + ';\n\n')
    
    f.write('SET FOREIGN_KEY_CHECKS = 1;\n')
print('[+] Successfully generated database/scripts/seed_10_records.sql')
