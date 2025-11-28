# services/confidence_service.py

from typing import Dict, Any
from database import get_conn
from services.prompt_builder import build_prompt3B
from services.llm_service import ask_model
import json

async def generate_confidence(data: Dict[str, Any]) -> Dict[str, Any]:
    session_id = data["session_id"]
    category = data["category"]

    db = await get_conn()

    # ---------------------------------------------------------
    # 1. Fetch emissions snapshot
    # ---------------------------------------------------------
    snapshot = await db.fetchrow("""
        SELECT id, raw_emissions, steps, scope
        FROM emissions_snapshots
        WHERE session_id = $1 AND category = $2
    """, session_id, category)

    if not snapshot:
        raise ValueError("No emissions snapshot found. Run 3A first.")

    snapshot_id = snapshot["id"]
    raw_emissions = snapshot["raw_emissions"]
    raw_steps = snapshot["steps"]
    scope = snapshot["scope"]

    profile_row = await db.fetchrow("""
    SELECT company_profile
    FROM sessions
    WHERE session_id = $1
    """, session_id)

    company_profile = profile_row["company_profile"] if profile_row else {}

    # ---------------------------------------------------------
    # 2. Fetch structured fields
    # ---------------------------------------------------------
    field_rows = await db.fetch("""
        SELECT entity_id, field_name, field_value_text, field_value_float
        FROM structured_fields
        WHERE session_id = $1 AND category = $2
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

    # ---------------------------------------------------------
    # 3. Build Prompt 3B
    # ---------------------------------------------------------
    prompt = build_prompt3B({
        "raw_emissions": raw_emissions,
        "raw_steps": raw_steps,
        "structured_fields": structured_fields,
        "scope": scope,
        "company_profile": company_profile
    })

    # ---------------------------------------------------------
    # 4. Ask LLM
    # ---------------------------------------------------------
    llm_output = await ask_model(prompt)

    calculation_valid = bool(llm_output.get("calculation_valid", False))
    confidence_model = float(llm_output.get("confidence_model", 0.0))
    missing_fields = llm_output.get("missing_fields", []) or []
    correction_note = llm_output.get("correction_note")

    # ---------------------------------------------------------
    # 5. Compute confidence_data + confidence_final
    # ---------------------------------------------------------
    present_fields = len(structured_fields)
    missing = len(missing_fields)
    total_fields = present_fields + missing

    confidence_data = 1.0 if total_fields == 0 else (1 - missing / total_fields)
    confidence_final = 0.5 * confidence_model + 0.5 * confidence_data

    # ---------------------------------------------------------
    # 6. Update emissions snapshot
    # ---------------------------------------------------------
    await db.execute("""
        UPDATE emissions_snapshots
        SET
            calculation_valid = $1,
            confidence_model = $2,
            confidence_data = $3,
            confidence_final = $4,
            missing_fields = $5
        WHERE id = $6
    """,
        calculation_valid,
        confidence_model,
        confidence_data,
        confidence_final,
        json.dumps(missing_fields),
        snapshot_id
    )

    # ---------------------------------------------------------
    # 7. UPDATE SESSIONS TABLE (only if category matches)
    # ---------------------------------------------------------
    session_row = await db.fetchrow("""
        SELECT current_category
        FROM sessions
        WHERE session_id = $1
    """, session_id)

    if session_row and session_row["current_category"] == category:
        await db.execute("""
            UPDATE sessions
            SET missing_fields = $1
            WHERE session_id = $2
        """, missing_fields, session_id)

    # ---------------------------------------------------------
    # 8. Return final response
    # ---------------------------------------------------------
    return {
        "scope": scope,
        "calculation_valid": calculation_valid,
        "confidence_model": confidence_model,
        "confidence_data": confidence_data,
        "confidence_final": confidence_final,
        "missing_fields": missing_fields,
        "correction_note": correction_note
    }