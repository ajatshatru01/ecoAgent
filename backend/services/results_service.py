# services/results_service.py

from typing import Dict, Any, List
from database import get_conn  # asyncpg pool


class ResultsService:
    @staticmethod
    async def get_results(session_id: str) -> Dict[str, Any]:
        db = await get_conn()

        # -------------------------------------------------
        # FETCH CATEGORY-LEVEL SNAPSHOTS
        # -------------------------------------------------
        rows = await db.fetch(
            """
            SELECT category, raw_emissions, scope, confidence_final
            FROM emissions_snapshots
            WHERE session_id = $1
            """,
            session_id,
        )

        if not rows:
            return {
                "total_yearly_emissions": 0.0,
                "confidence_weighted_score": 0.0,
                "top_categories": [],
                "scope1_total": 0.0,
                "scope2_total": 0.0,
                "scope3_total": 0.0,
                "categories_detailed": [],
            }

        # -------------------------------------------------
        # TOTAL YEARLY EMISSIONS
        # -------------------------------------------------
        total_raw = sum((r["raw_emissions"] or 0.0) for r in rows)

        # -------------------------------------------------
        # CONFIDENCE (WEIGHTED)
        # -------------------------------------------------
        weighted_conf_sum = 0.0
        if total_raw > 0:
            for r in rows:
                raw = r["raw_emissions"] or 0.0
                conf = r.get("confidence_final") or 0.0
                weight = raw / total_raw
                weighted_conf_sum += weight * conf

        # -------------------------------------------------
        # TOP CATEGORIES
        # -------------------------------------------------
        sorted_rows = sorted(
            rows,
            key=lambda x: (x["raw_emissions"] or 0.0),
            reverse=True,
        )

        top = [
            {
                "category": r["category"],
                "raw_emissions": r["raw_emissions"],
            }
            for r in sorted_rows
        ]

        # -------------------------------------------------
        # SCOPE TOTALS
        # -------------------------------------------------
        scope1 = sum(
            (r["raw_emissions"] or 0.0)
            for r in rows
            if (r.get("scope") or "").strip().lower() == "scope 1"
        )
        scope2 = sum(
            (r["raw_emissions"] or 0.0)
            for r in rows
            if (r.get("scope") or "").strip().lower() == "scope 2"
        )
        scope3 = sum(
            (r["raw_emissions"] or 0.0)
            for r in rows
            if (r.get("scope") or "").strip().lower() == "scope 3"
        )

        # -------------------------------------------------
        # ENTITY-LEVEL BREAKDOWN FROM structured_fields TABLE
        # -------------------------------------------------
        entity_rows = await db.fetch(
            """
            SELECT category, entity_id, entity_emission
            FROM structured_fields
            WHERE session_id = $1
            """,
            session_id,
        )

        # Deduplicate and remove NULL emission entities
        cat_to_entities: Dict[str, Dict[str, Dict[str, Any]]] = {}

        for e in entity_rows:
            emission = e["entity_emission"]

            # skip null emission values
            if emission is None:
                continue

            cat = e["category"]
            if cat not in cat_to_entities:
                cat_to_entities[cat] = {}

            # dedupe by entity_id
            cat_to_entities[cat][e["entity_id"]] = {
                "entity_id": e["entity_id"],
                "emission_tonnes": emission,
            }

        # -------------------------------------------------
        # BUILD categories_detailed ARRAY
        # -------------------------------------------------
        categories_detailed: List[Dict[str, Any]] = []

        for r in rows:
            cat_name = r["category"]
            entities_list = (
                list(cat_to_entities.get(cat_name, {}).values())
                if cat_name in cat_to_entities
                else []
            )

            categories_detailed.append(
                {
                    "category": cat_name,
                    "raw_emissions": r["raw_emissions"],
                    "entities": entities_list,
                }
            )

        # -------------------------------------------------
        # RETURN FINAL RESULT
        # -------------------------------------------------
        return {
            "total_yearly_emissions": total_raw,
            "confidence_weighted_score": weighted_conf_sum,
            "top_categories": top,
            "scope1_total": scope1,
            "scope2_total": scope2,
            "scope3_total": scope3,
            "categories_detailed": categories_detailed,
        }