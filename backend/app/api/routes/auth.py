from fastapi import APIRouter, Depends

from app.api.deps import require_account
from app.schemas import CandidateRegisterRequest, CommitteeRegisterRequest, LoginRequest
from app.services.auth_service import login, register_candidate, register_committee

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register/candidate")
def register_candidate_route(payload: CandidateRegisterRequest):
    account, session = register_candidate(payload)
    return {"account": account, "session": session}


@router.post("/register/committee")
def register_committee_route(payload: CommitteeRegisterRequest):
    account, session = register_committee(payload)
    return {"account": account, "session": session}


@router.post("/login")
def login_route(payload: LoginRequest):
    account, session = login(payload)
    return {"account": account, "session": session}


@router.get("/me")
def me_route(account=Depends(require_account)):
    return {"account": account}
