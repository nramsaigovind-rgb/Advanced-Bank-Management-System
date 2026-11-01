import os
import sys
import pymysql
from dotenv import load_dotenv

load_dotenv()

def init_bank_database():
    root_pwd = os.environ.get("MYSQL_ROOT_PASSWORD")
    if not root_pwd:
        print("[ERROR] MYSQL_ROOT_PASSWORD environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    host = os.environ.get("MYSQL_HOST", "127.0.0.1")
    port = int(os.environ.get("MYSQL_PORT", 3306))
    app_user = os.environ.get("DB_USER", "bank_app")
    app_pwd = os.environ.get("DB_PASSWORD", "BankAppSecure2026!")
    db_name = os.environ.get("DB_NAME", "bank_management")

    print("[*] Connecting to MySQL as root...")
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user="root",
            password=root_pwd,
            charset="utf8mb4",
            autocommit=True
        )
    except Exception as e:
        print(f"[ERROR] Failed to connect to MySQL as root: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)

    with conn.cursor() as cur:
        # Create database
        print(f"[*] Ensuring database `{db_name}` exists with utf8mb4...")
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")

        # Create application user
        print(f"[*] Creating dedicated application user `{app_user}`...")
        # Escape single quotes in app_pwd if any
        escaped_pwd = app_pwd.replace("'", "''")
        for host_target in ['localhost', '127.0.0.1', '%']:
            cur.execute(f"CREATE USER IF NOT EXISTS '{app_user}'@'{host_target}' IDENTIFIED BY '{escaped_pwd}';")
            cur.execute(f"ALTER USER '{app_user}'@'{host_target}' IDENTIFIED BY '{escaped_pwd}';")
            cur.execute(f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{app_user}'@'{host_target}';")
            # Grant access to performance_schema for the Lock Monitor
            try:
                cur.execute(f"GRANT SELECT, PROCESS ON *.* TO '{app_user}'@'{host_target}';")
            except Exception:
                pass

        cur.execute("FLUSH PRIVILEGES;")
        print("[+] Database and dedicated user configured successfully.")
    conn.close()

    # Verify app user connection
    print(f"[*] Verifying connection as `{app_user}` to `{db_name}`...")
    app_conn = pymysql.connect(
        host=host,
        port=port,
        user=app_user,
        password=app_pwd,
        database=db_name,
        charset="utf8mb4"
    )
    with app_conn.cursor() as cur:
        cur.execute("SELECT DATABASE(), CURRENT_USER(), VERSION()")
        row = cur.fetchone()
        print(f"[+] Verified successfully: Connected to {row[0]} as {row[1]} on MySQL {row[2]}")
    app_conn.close()

if __name__ == "__main__":
    init_bank_database()
