# services/summary_service.py

from database import get_conn
from typing import Dict, Any
from services.llm_service import ask_model
from services.prompt_builder import build_prompt2

async def generate_summary(session_id: str, category: str) -> Dict[str, Any]:
    """
    Simplified summary logic:
    - Get existing summary
    - Fetch ALL Q/A for the given category (no timestamps)
    - Build Prompt2
    - Send to LLM
    - Save updated summary
    """
    conn = await get_conn()

    # --- Fetch existing summary ---
    session = await conn.fetchrow("""
        SELECT summary_text
        FROM sessions
        WHERE session_id = $1
    """, session_id)

    if not session:
        raise ValueError("Invalid session_id")

    previous_summary = session["summary_text"] or ""

    # --- Fetch ALL Q/A for this category ---
    qa_rows = await conn.fetch("""
        SELECT question_text, answer_text
        FROM qa_messages
        WHERE session_id = $1
          AND category = $2
        ORDER BY id ASC
    """, session_id, category)

    recent_qa = [
        {
            "question": r["question_text"],
            "answer": r["answer_text"]
        }
        for r in qa_rows
    ]

    # --- Build Prompt2 ---
    prompt_data = {
        "previous_summary": previous_summary,
        "recent_qa": recent_qa
    }

    prompt = build_prompt2(prompt_data)

    # --- Ask LLM ---
    llm_output = await ask_model(prompt)

    updated_summary = llm_output.get("updated_summary", "").strip()
    if not updated_summary:
        raise ValueError("LLM returned empty summary")

    # --- Update DB ---
    await conn.execute("""
        UPDATE sessions
        SET summary_text = $1
        WHERE session_id = $2
    """, updated_summary, session_id)

    return {"updated_summary": updated_summary}