# llm_service.py
import json
import re
from google import genai
import os

def _extract_json_block(text: str) -> str | None:
    """Find largest JSON object substring in text (naive but effective)."""
    # find first '{' and last '}' and try parsing; iterate to find a valid parse
    start_idxs = [m.start() for m in re.finditer(r'\{', text)]
    end_idxs = [m.start() for m in re.finditer(r'\}', text)]
    if not start_idxs or not end_idxs:
        return None

    # Try pairs (start from earliest start, latest end) to find parseable JSON
    for s in start_idxs:
        for e in reversed(end_idxs):
            if e <= s:
                continue
            candidate = text[s:e+1]
            try:
                json.loads(candidate)
                return candidate
            except Exception:
                continue
    return None

async def ask_model(prompt: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model = "gemini-2.5-flash",
            contents = prompt
        )

        raw = getattr(response, "text", None) or str(response)
        # 1) try full-parse
        try:
            return json.loads(raw)
        except Exception:
            pass

        # 2) try extracting JSON block
        block = _extract_json_block(raw)
        if block:
            try:
                return json.loads(block)
            except Exception:
                pass

        # 3) fallback: return helpful debug dict (do NOT return empty dict)
        print("❌ LLM did not return valid JSON. Raw response:", raw)
        return {
            "__llm_raw_text": raw,
            "next_question": "",
            "category_complete": False,
            "next_category": None,
            "analysis_complete": False,
            "updated_missing_field": [],
            "extracted_fields": []
        }

    except Exception as e:
        print("Model request failed:", e)
        # raise or return an explicit failure dict
        return {
            "__llm_error": str(e),
            "next_question": "",
            "category_complete": False,
            "next_category": None,
            "analysis_complete": False,
            "updated_missing_field": [],
            "extracted_fields": []
        }