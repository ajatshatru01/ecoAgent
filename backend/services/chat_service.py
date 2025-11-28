# services/chat_service.py
from database import get_conn
from typing import Dict, Any
from services.embedding_service import embed_text
from services.llm_service import ask_model
from services.prompt_builder import build_prompt1
from services.vector_search import semantic_search
import json

# ---------------------------
# FIRST QUESTION
# ---------------------------
async def first_question(session_id: str) -> Dict[str, Any]:
    connection = await get_conn()
    row = await connection.fetchrow("""
        SELECT company_profile, current_category
        FROM sessions
        WHERE session_id = $1
    """, session_id)

    if not row:
        raise ValueError("Invalid session_id")

    data = {
        "company_profile": row["company_profile"],
    }

    prompt = build_prompt1(data)
    llm_json = await ask_model(prompt)

    await connection.execute("""
        UPDATE sessions
        SET current_category = $1
        WHERE session_id = $2
    """,
        llm_json.get("next_category") or row["current_category"],
        session_id
    )

    return llm_json


# ---------------------------
# NEXT QUESTION
# ---------------------------
async def next_question(req_data: Dict[str, Any]) -> Dict[str, Any]:
    session_id = req_data["session_id"]
    category = req_data["category"]
    question = req_data["question"]
    answer = req_data["answer"]

    connection = await get_conn()

    # ---------- STORE Q & A ----------
    await connection.execute("""
        INSERT INTO qa_messages (session_id, category, question_text, answer_text)
        VALUES ($1, $2, $3, $4)
    """, session_id, category, question, answer)

    # ---------- VECTOR MEMORY INSERT ----------
    content = f"Q: {question}\nA: {answer}"
    entry_embedding = embed_text(content)

    await connection.execute("""
        INSERT INTO vector_memory (session_id, content, category, embedding)
        VALUES ($1, $2, $3, $4)
    """, session_id, content, category, entry_embedding)

    # ---------- FETCH SESSION DATA ----------
    session_row = await connection.fetchrow("""
        SELECT company_profile, summary_text, current_category, missing_fields
        FROM sessions WHERE session_id = $1
    """, session_id)

    # ---------- Q/A IN CURRENT CATEGORY ----------
    qa_category_rows = await connection.fetch("""
        SELECT question_text, answer_text
        FROM qa_messages
        WHERE session_id = $1 AND category = $2
        ORDER BY created_at ASC
    """, session_id, category)

    qa_in_category = [
        {"question": r["question_text"], "answer": r["answer_text"]}
        for r in qa_category_rows
    ]

    # ---------- SEMANTIC VECTOR SEARCH ----------
    relevant_qa = await semantic_search(
        session_id=session_id,
        current_category=category,
        query_embedding=entry_embedding,
        limit=5
    )

    # ---------- LAST Q/A ----------
    last_qa = [{"question": question, "answer": answer}]

    # ---------- BUILD PROMPT INPUT DATA ----------
    data = {
        "company_profile": session_row["company_profile"],
        "summary": session_row["summary_text"] or "",
        "relevant_qa": relevant_qa,
        "missing_fields": session_row["missing_fields"] or [],
        "current_category": session_row["current_category"],
        "qa_in_category": qa_in_category,
        "last_qa": last_qa,
    }

    prompt = build_prompt1(data)
    llm_json = await ask_model(prompt)

    # ---------- STORE EXTRACTED FIELDS ----------
    extracted_fields = llm_json.get("extracted_fields") or []
    for sf in extracted_fields:
        await connection.execute("""
            INSERT INTO structured_fields (
                session_id, category, entity_id, field_name,
                field_value_text, field_value_float
            )
            VALUES ($1, $2, $3, $4, $5, $6)
        """,
        session_id, category,
        sf.get("entity_id"),
        sf.get("field_name"),
        sf.get("field_value_text"),
        sf.get("field_value_float")
    )

    # ---------- UPDATE SESSION STATE ----------
    await connection.execute("""
        UPDATE sessions
        SET current_category = $1,
            missing_fields = $2,
            category_completion = $3
        WHERE session_id = $4
    """,
        llm_json.get("next_category") or session_row["current_category"],
        json.dumps(llm_json.get("updated_missing_field") or []),
        llm_json.get("category_complete", False),
        session_id
    )

    return llm_json