# routers/confidence_router.py

from fastapi import APIRouter, HTTPException
from schemas import ConfidenceRequest, ConfidenceResponse
from services.confidence_service import generate_confidence

router = APIRouter()

@router.post("/check", response_model=ConfidenceResponse)
async def check_confidence(payload: ConfidenceRequest):
    try:
        return await generate_confidence(payload.model_dump())
    except Exception as e:
        print("❌ Confidence generation failed:", e)
        raise HTTPException(status_code=500, detail=str(e))