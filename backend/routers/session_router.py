from fastapi import APIRouter, HTTPException
from schemas import StartSessionInput
from services.session_dbservice import create_session

router = APIRouter()

#Takes company profile as input and class session service to save a session in db and returns session id
@router.post("/start")
async def start_session(payload: StartSessionInput):
    try:
        session_id = await create_session(payload.company_profile)
        return {"session_id": str(session_id)}
    except Exception as e:
        print("Session creation failed:", e)
        raise HTTPException(status_code=500, detail="Failed to create session")