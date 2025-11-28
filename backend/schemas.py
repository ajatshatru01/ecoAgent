#Pydantic for data validation once routers will be decided.

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

#AFTER HARDCODED QUESTIONS
class StartSessionInput(BaseModel):
    company_profile: dict  #JSONB


#FIRST QUESTION REQUEST
class ChatFirstRequest(BaseModel):
    session_id: str

#SUBSEQUENT QUESTION REQUEST
class ChatNextRequest(BaseModel):
    session_id: str
    category: str
    question: str
    answer: str
    missing_fields: Optional[List[Dict[str, Any]]] = []

#LLM RESPONSE MODEL
class ChatLLMResponse(BaseModel):
    next_question: Optional[str]
    category_complete: bool
    next_category: Optional[str]
    analysis_complete: bool
    updated_missing_field: Optional[List[Dict[str, Any]]]
    extracted_fields: Optional[List[Dict[str, Any]]]

# --- SUMMARY MODELS ---
class SummaryRequest(BaseModel):
    session_id: str
    category: str

class SummaryResponse(BaseModel):
    updated_summary: str


# --- EMISSIONS MODELS (Prompt 3A) ---
class EmissionsRequest(BaseModel):
    session_id: str
    category: str
    correction_note: Optional[str] = None

class EmissionsResponse(BaseModel):
    scope: str
    raw_emissions: float
    raw_calculation_steps: str