import os
import asyncpg
from pgvector.asyncpg import register_vector
from contextlib import asynccontextmanager

DATABASE_URL = os.getenv("DATABASE_URL")

conn = None

@asynccontextmanager
async def lifespan(app):
    global conn

    # --- STARTUP ---
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.execute("SELECT 1;")
        print("✅ Database connected.")
        await register_vector(conn)
    except Exception as e:
        print("❌ Database connection failed:", e)
        raise

    yield

    # --- SHUTDOWN ---
    try:
        await conn.close()
        print("🔌 Database disconnected.")
    except Exception as e:
        print("⚠️ Error during DB shutdown:", e)

async def get_conn():
    return conn