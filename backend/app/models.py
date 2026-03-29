from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


Role = Literal["candidate", "committee"]
CandidateStatus = Literal["in_progress", "completed", "shortlisted", "rejected", "flagged"]
Decision = Literal["approve", "hold", "reject"]
AttachmentKind = Literal["text", "audio", "video", "document"]


class Account(BaseModel):
    id: str
    role: Role
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    password_hash: str
    entity_id: str
    created_at: datetime
    updated_at: datetime


class CommitteeVote(BaseModel):
    member_id: str
    member_name: str
    decision: Decision
    rationale: str
    created_at: datetime


class ChatAttachment(BaseModel):
    id: str
    kind: AttachmentKind
    name: str
    mime_type: str
    size_kb: int
    status: Literal["uploaded", "processing", "ready"] = "ready"
    transcript: str | None = None
    extracted_signals: list[str] = Field(default_factory=list)
    storage_path: str | None = None


class ChatMessage(BaseModel):
    id: str
    role: Literal["assistant", "user"]
    content: str
    created_at: datetime
    attachments: list[ChatAttachment] = Field(default_factory=list)


class ScoreSnapshot(BaseModel):
    cognitive: float = 0
    leadership: float = 0
    growth: float = 0
    decision: float = 0
    motivation: float = 0
    authenticity: float = 0
    final_score: float = 0
    confidence: float = 0
    ai_detection_prob: float = 0
    needs_manual_review: bool = True
    recommendation: str | None = None
    explanation: str | None = None


class CandidateProfile(BaseModel):
    id: str
    code: str
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    city: str = "Unspecified"
    program: str = "inVision U Applicant"
    goals: str = "To be collected during the interview."
    experience: str = "To be collected during the interview."
    motivation_text: str = "To be collected during the interview."
    essay_excerpt: str = "To be collected during the interview."
    status: CandidateStatus = "in_progress"
    created_at: datetime
    updated_at: datetime


class InterviewSession(BaseModel):
    id: str
    candidate_id: str
    account_id: str
    messages: list[ChatMessage] = Field(default_factory=list)
    artifacts: list[ChatAttachment] = Field(default_factory=list)
    progress: int = 12
    status: Literal["active", "completed"] = "active"
    phase: str = "Foundation"
    score_update: ScoreSnapshot | None = None
    created_at: datetime
    updated_at: datetime


class CommitteeMember(BaseModel):
    id: str
    name: str
    email: EmailStr
    created_at: datetime


class AuthSession(BaseModel):
    token: str
    account_id: str
    role: Role
    created_at: datetime
    expires_at: datetime


class CandidateDetail(BaseModel):
    candidate: CandidateProfile
    session: InterviewSession | None = None
    votes: list[CommitteeVote] = Field(default_factory=list)


class AnalyticsSummary(BaseModel):
    total_candidates: int
    shortlisted: int
    flagged: int
    average_score: float
    pending_committee_review: int
