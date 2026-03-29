from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_account
from app.schemas import VoteRequest
from app.services.committee_service import save_vote

router = APIRouter(prefix="/api/v1/committee", tags=["committee"])


@router.post("/vote")
def vote_route(payload: VoteRequest, account=Depends(require_account)):
    if account.role != "committee":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Committee role required")
    vote = save_vote(account.id, payload.candidate_id, account.entity_id, account.name, payload)
    return {"vote": vote}
