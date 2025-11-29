# routers/results_router.py

from fastapi import APIRouter, HTTPException
from schemas import ResultsResponse
from services.results_service import ResultsService

router = APIRouter()


@router.get("/{session_id}", response_model=ResultsResponse)
async def get_results(session_id: str):
    data = await ResultsService.get_results(session_id)
    return ResultsResponse(**data)