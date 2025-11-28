'''
        for first question:
        input: session id (frontend)
        db -> from session id checks session table gets company profile (rest is empty) and passes
        to: prompt builder -> generates prompt -> llm_service -> response (question, sector)
        -> sends response to frontend and edits sector field to sector.

        after user answers and we have stuff like summary:
        input: session id, sector, question, answer, missing fields(if any) (frontend)
        db storing -> stores session_id, question, sector and answer in qa_messages table,
        stores question and answer together as content, session id and sector in vector memory table
        only after genearting an embedding for content using text embedding model inside services->embedding_service,
        For actually generating next question:
        db pulling-> from session id gets company profile and summary, and from sector gets current
        sector and missing fields if any (sessions table), from sector and session id gets
        q and a in that sector (qa_messages table), gets relevant q and a NOT from the current
        sector from vector_memory table as we are already getting same sector
        q and a from qa_messages table, current sector and last q and a is passed as the input
        -> prompt builder -> llm_service -> response (next question, new sector if old complete
        other wise null, sector completion flag, analysis completion flag, updated missing field
        if there were any, extracted fields from the last q and a) ->

        db storing -> Stores session_id, sector from input and field_name, entity_id, field_name,
        field_type, field_value_text, field_value_float from extracted fields into structured_fields
        table
        cycle repeats until sector completes

'''
# routers/chat_router.py
from fastapi import APIRouter, HTTPException
from typing import Union
from schemas import ChatFirstRequest, ChatNextRequest, ChatLLMResponse
from services.chat_service import first_question, next_question

router = APIRouter()

@router.post("/next", response_model=ChatLLMResponse)
async def chat_next(payload: Union[ChatFirstRequest, ChatNextRequest]):
    try:
        # FIRST QUESTION CASE
        if isinstance(payload, ChatFirstRequest):
            return await first_question(payload.session_id)

        # NEXT QUESTION CASE
        result = await next_question(payload.model_dump())
        return result

    except Exception as e:
        print("❌ Chat flow error:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")