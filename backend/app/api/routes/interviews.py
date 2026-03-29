from fastapi import APIRouter, Depends

from app.api.deps import require_account
from app.schemas import MessageRequest
from app.services.interview_service import append_message, get_session

router = APIRouter(prefix="/api/v1/interviews", tags=["interviews"])


@router.get("/me")
def my_interview_route(account=Depends(require_account)):
    return {"session": get_session(account.id)}


@router.post("/message")
def interview_message_route(payload: MessageRequest, account=Depends(require_account)):
    session = append_message(account.id, payload.session_id, payload.message, payload.attachments)
    return {"session": session}
