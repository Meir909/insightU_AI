from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.models import Decision, Role


class CandidateRegisterRequest(BaseModel):
    role: Role = "candidate"
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr | None = None
    phone: str = Field(pattern=r"^\+7\d{10}$")
    password: str = Field(min_length=8, max_length=128)


class CommitteeRegisterRequest(BaseModel):
    role: Role = "committee"
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    access_key: str = Field(min_length=4)


class LoginRequest(BaseModel):
    role: Role
    identifier: str = Field(min_length=3)
    password: str = Field(min_length=8, max_length=128)


class VoteRequest(BaseModel):
    candidate_id: str = Field(min_length=1)
    decision: Decision
    rationale: str = Field(min_length=10, max_length=600)


class AttachmentPayload(BaseModel):
    id: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    name: str = Field(min_length=1)
    mime_type: str = Field(min_length=1)
    size_kb: int = Field(ge=0)
    status: str = Field(min_length=1)
    transcript: str | None = None
    extracted_signals: list[str] = Field(default_factory=list)
    storage_path: str | None = None


class MessageRequest(BaseModel):
    session_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    attachments: list[AttachmentPayload] = Field(default_factory=list)


class SessionCreateRequest(BaseModel):
    account_id: str = Field(min_length=1)
