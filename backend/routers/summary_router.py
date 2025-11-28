# routers/summary_router.py
from fastapi import APIRouter, HTTPException
from schemas import SummaryRequest, SummaryResponse
from services.summary_service import generate_summary

router = APIRouter()

@router.post("/update", response_model=SummaryResponse)
async def update_summary(payload: SummaryRequest):
    try:
        return await generate_summary(
            session_id=payload.session_id,
            category=payload.category
        )
    except Exception as e:
        print("❌ Summary failure:", e)
        raise HTTPException(status_code=500, detail=str(e))