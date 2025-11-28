# services/vector_search.py
from database import get_conn
from typing import List, Dict, Any

async def semantic_search(
    session_id: str,
    current_category: str,
    query_embedding: List[float],
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Returns top-N most similar vector_memory rows using cosine similarity.
    Excludes the current category.
    """
    connection = await get_conn()
    rows = await connection.fetch("""
        SELECT content, category
        FROM vector_memory
        WHERE session_id = $1
          AND category != $2
        ORDER BY embedding <=> $3
        LIMIT $4
    """, session_id, current_category, query_embedding, limit)

    return [
        {
            "content": r["content"],
            "category": r["category"]
        }
        for r in rows
    ]