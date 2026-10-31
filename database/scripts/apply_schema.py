import os
import sys
import pymysql
from dotenv import load_dotenv

load_dotenv()

def apply_schema():
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = int(os.getenv("DB_PORT", "3306"))
    user = os.getenv("DB_USER", "bank_app")
    password = os.getenv("DB_PASSWORD", "BankAppSecure2026!")
    db_name = os.getenv("DB_NAME", "bank_management")

    schema_file = os.path.join(os.path.dirname(__file__), "schema.sql")
    print(f"[*] Reading schema from {schema_file}...")
    with open(schema_file, "r", encoding="utf-8") as f:
        sql_content = f.read()

    print(f"[*] Connecting to MySQL as {user}@{host}:{port}/{db_name}...")
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db_name,
        charset="utf8mb4",
        client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS,
        autocommit=True
    )

    with conn.cursor() as cur:
        # Separate DELIMITER blocks
        # First execute standard DDL up to DELIMITER $$
        parts = sql_content.split("DELIMITER $$")
        main_ddl = parts[0]
        cur.execute(main_ddl)
        print("[+] Main DDL (tables, views, indexes, constraints) executed successfully.")

        # Then parse each procedure block between DELIMITER $$ and DELIMITER ;
        if len(parts) > 1:
            proc_block = parts[1].split("DELIMITER ;")[0]
            procedures = [p.strip() for p in proc_block.split("$$") if p.strip()]
            for proc in procedures:
                if proc:
                    cur.execute(proc)
                    print(f"[+] Procedure created.")

    conn.close()
    print("[+] All schema objects successfully applied.")

if __name__ == "__main__":
    apply_schema()

