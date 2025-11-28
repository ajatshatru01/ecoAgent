#Pydantic for data validation once routers will be decided.

from pydantic import BaseModel
from typing import Optional, List, Dict, Any

#AFTER HARDCODED QUESTIONS
class StartSessionInput(BaseModel):
    company_profile: dict  #JSONB


#FIRST QUESTION REQUEST
class ChatFirstRequest(BaseModel):
    session_id: str