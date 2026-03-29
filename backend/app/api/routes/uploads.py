from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import require_account
from app.models import Account
from app.services.artifact_service import save_upload

router = APIRouter(prefix="/api/v1/uploads", tags=["uploads"])


@router.post("")
def upload_route(file: UploadFile = File(...), account: Account = Depends(require_account)):
    if account.role != "candidate":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Candidate role required")
    return {"artifact": save_upload(file)}
