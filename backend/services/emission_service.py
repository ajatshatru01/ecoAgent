# services/emissions_service.py

from typing import Dict, Any
from database import get_conn
from services.prompt_builder import build_prompt3A
from services.llm_service import ask_model


async def generate_emissions(data: Dict[str, Any]) -> Dict[str, Any]:
    session_id = data["session_id"]
    category = data["category"]
    correction_note = data.get("correction_note", None)

    db = await get_conn()

    # 1. Fetch summary + company profile
    session_row = await db.fetchrow("SELECT summary_text, company_profile FROM sessions WHERE session_id = $1", session_id)
    if not session_row:
        raise ValueError("Invalid session_id")

    summary = session_row["summary_text"] or ""
    company_profile = session_row["company_profile"]

    # 2. Fetch structured fields
    field_rows = await db.fetch("""
        SELECT id, entity_id, field_name, field_value_text, field_value_float
        FROM structured_fields
        WHERE session_id = $1 AND category = $2
    """, session_id, category)

    structured_fields = [
        {
            "id": r["id"],
            "entity_id": r["entity_id"],
            "field_name": r["field_name"],
            "field_value_text": r["field_value_text"],
            "field_value_float": r["field_value_float"]
        }
        for r in field_rows
    ]

    # 3. Build prompt
    prompt = build_prompt3A({
        "summary": summary,
        "category": category,
        "structured_fields": structured_fields,
        "correction_note": correction_note,
        "company_profile": company_profile
    })

    # 4. Ask LLM
    llm_output = await ask_model(prompt)

    scope = llm_output.get("scope", "").strip()
    raw_emissions = llm_output.get("raw_emissions", None)
    raw_steps = llm_output.get("raw_calculation_steps", "")
    entity_emissions = llm_output.get("entity_emissions", [])

    # 5. Insert or update emissions snapshot
    existing = await db.fetchrow("""
        SELECT id FROM emissions_snapshots
        WHERE session_id = $1 AND category = $2
    """, session_id, category)

    if existing:
        await db.execute("""
            UPDATE emissions_snapshots
            SET scope = $1, raw_emissions = $2, steps = $3
            WHERE id = $4
        """, scope, raw_emissions, raw_steps, existing["id"])
    else:
        await db.execute("""
            INSERT INTO emissions_snapshots (session_id, category, scope, raw_emissions, steps)
            VALUES ($1, $2, $3, $4, $5)
        """, session_id, category, scope, raw_emissions, raw_steps)

    # 6. Update entity_emission for each structured field
    for row in entity_emissions:
        eid = row["entity_id"]
        emission_val = row["emission_tonnes"]

        await db.execute("""
            UPDATE structured_fields
            SET entity_emission = $1
            WHERE session_id = $2 AND category = $3 AND entity_id = $4
        """, emission_val, session_id, category, eid)

    return {
        "scope": scope,
        "raw_emissions": raw_emissions,
        "raw_calculation_steps": raw_steps,
        "entity_emissions": entity_emissions
    }