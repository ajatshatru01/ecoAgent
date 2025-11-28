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