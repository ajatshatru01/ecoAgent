# routers/emissions_router.py

from fastapi import APIRouter, HTTPException
from schemas import EmissionsRequest, EmissionsResponse
from services.emission_service import generate_emissions

router = APIRouter()


@router.post("/calculate", response_model=EmissionsResponse)
async def calculate_emissions(payload: EmissionsRequest):
    try:
        result = await generate_emissions(payload.model_dump())
        return result

    except Exception as e:
        print("❌ Emissions generation failed:", e)
        raise HTTPException(status_code=500, detail=str(e))