from fastapi import APIRouter, HTTPException

from app.services.candidate_service import get_candidate, list_candidates, shortlist

router = APIRouter(prefix="/api/v1/candidates", tags=["candidates"])


@router.get("")
def list_candidates_route():
    return {"candidates": list_candidates()}


@router.get("/shortlist")
def shortlist_route():
    return {"candidates": shortlist()}


@router.get("/{candidate_id}")
def get_candidate_route(candidate_id: str):
    payload = get_candidate(candidate_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return payload
