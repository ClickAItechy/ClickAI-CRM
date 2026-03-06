import psycopg2
import os

DATABASE_URL = "postgresql://postgres.bjsudfixnbwnmldkxtdg:AXoARqnkDehaHXtJ@db.bjsudfixnbwnmldkxtdg.supabase.co:5432/postgres"

print("Connecting to Supabase...")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

try:
    print("Checking applied migrations...")
    cur.execute("""
        SELECT name, applied 
        FROM django_migrations 
        WHERE app='crm' 
        ORDER BY id DESC LIMIT 10;
    """)
    for row in cur.fetchall():
        print(row)

except Exception as e:
    print("Error:", e)
finally:
    cur.close()
    conn.close()

