# services/emissions_service.py

from typing import Dict, Any
from database import get_conn
from services.prompt_builder import build_prompt3A
from services.llm_service import ask_model


async def generate_emissions(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prompt 3A:
    - Reads summary + structured fields
    - Builds the emissions prompt
    - Calls the LLM
    - Saves output in emissions_snapshots
    - Updates existing snapshot if rerun with correction_note
    """

    session_id = data["session_id"]
    category = data["category"]
    correction_note = data.get("correction_note", None)

    db = await get_conn()

    # ----------------------------------------
    # 1. Fetch summary_text from sessions table
    # ----------------------------------------
    session_row = await db.fetchrow("""
        SELECT summary_text
        FROM sessions
        WHERE session_id = $1
    """, session_id)

    if not session_row:
        raise ValueError("Invalid session_id")

    summary = session_row["summary_text"] or ""

    profile_row = await db.fetchrow("""
    SELECT company_profile
    FROM sessions
    WHERE session_id = $1
    """, session_id)

    company_profile = profile_row["company_profile"] if profile_row else {}

    # -------------------------------------------------------
    # 2. Fetch structured fields for this category (3A inputs)
    # -------------------------------------------------------
    field_rows = await db.fetch("""
        SELECT entity_id, field_name, field_value_text, field_value_float
        FROM structured_fields
        WHERE session_id = $1 AND category = $2
        ORDER BY id ASC
    """, session_id, category)

    structured_fields = [
        {
            "entity_id": r["entity_id"],
            "field_name": r["field_name"],
            "field_value_text": r["field_value_text"],
            "field_value_float": r["field_value_float"]
        }
        for r in field_rows
    ]

    # --------------------------
    # 3. Prepare Prompt 3A input
    # --------------------------
    prompt_data = {
        "summary": summary,
        "category": category,
        "structured_fields": structured_fields,
        "correction_note": correction_note,
        "company_profile": company_profile
    }

    prompt = build_prompt3A(prompt_data)

    # --------------------------
    # 4. Call LLM (Prompt 3A)
    # --------------------------
    llm_output = await ask_model(prompt)

    scope = llm_output.get("scope", "").strip()
    raw_emissions = float(llm_output.get("raw_emissions", 0.0))
    raw_calculation_steps = llm_output.get("raw_calculation_steps", "")

    # ----------------------------------------------------------
    # 5. Insert OR Update emissions_snapshots (corrections logic)
    # ----------------------------------------------------------

    # Check if a snapshot already exists for this category
    existing = await db.fetchrow("""
        SELECT id
        FROM emissions_snapshots
        WHERE session_id = $1 AND category = $2
        ORDER BY created_at DESC
        LIMIT 1
    """, session_id, category)

    if existing:
        # ---- UPDATE existing snapshot ----
        await db.execute("""
            UPDATE emissions_snapshots
            SET scope = $1,
                raw_emissions = $2,
                steps = $3
            WHERE id = $4
        """,
            scope,
            raw_emissions,
            raw_calculation_steps,
            existing["id"]
        )
    else:
        # ---- INSERT new snapshot ----
        await db.execute("""
            INSERT INTO emissions_snapshots (
                session_id,
                category,
                scope,
                raw_emissions,
                steps
            )
            VALUES ($1, $2, $3, $4, $5)
        """,
            session_id,
            category,
            scope,
            raw_emissions,
            raw_calculation_steps
        )

    # -------------------
    # 6. Return result
    # -------------------
    return {
        "scope": scope,
        "raw_emissions": raw_emissions,
        "raw_calculation_steps": raw_calculation_steps
    }