import asyncpg
from database import get_conn
import json

#Insert a new session row inside sessions table and returns session_id
async def create_session(company_profile: dict) -> str:
    connection = await get_conn()

    query = """
    INSERT INTO sessions (company_profile) VALUES ($1::jsonb) RETURNING session_id;
    """
    row = await connection.fetchrow(query, json.dumps(company_profile))
    return row["session_id"]