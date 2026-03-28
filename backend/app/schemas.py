from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class CandidateStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    shortlisted = "shortlisted"
    rejected = "rejected"
    flagged = "flagged"


class ConsentPayload(BaseModel):
    terms_accepted: bool = False
    privacy_accepted: bool = False
    timestamp: datetime | None = None


class CandidateInput(BaseModel):
    telegram_id: int
    language: str = Field(default="ru", pattern="^(ru|kk|en)$")
    full_name: str | None = None
    age_range: str | None = None
    city: str | None = None
    school_name: str | None = None
    graduation_year: int | None = None
    motivation: str | None = None
    achievements: str | None = None
    leadership_story: str | None = None
    essay: str | None = Field(default=None, max_length=2000)
    case_response: str | None = None
    interview_answers: list[str] = Field(default_factory=list)
    file_urls: list[str] = Field(default_factory=list)
    video_urls: list[str] = Field(default_factory=list)
    voice_urls: list[str] = Field(default_factory=list)
    consent: ConsentPayload


class CandidateScore(BaseModel):
    cognitive: float
    leadership: float
    growth: float
    decision: float
    motivation: float
    authenticity: float
    final_score: float
    confidence: float
    ai_detection_prob: float
    needs_manual_review: bool
    status: CandidateStatus
    recommendation: str
    reasoning: str
    key_quotes: list[str]
    fairness_notes: list[str]


class CandidateRecord(BaseModel):
    id: str
    code: str
    status: CandidateStatus
    city: str | None = None
    program: str = "inVision U"
    language: str = "ru"
    created_at: datetime
    updated_at: datetime
    telegram_id: int
    consent: ConsentPayload
    raw: CandidateInput
    score: CandidateScore | None = None


class RankingResponse(BaseModel):
    candidates: list[dict[str, Any]]


class FairnessReport(BaseModel):
    fairnessScore: float
    avgConfidence: float
    manualReviewRate: float
    explanation: str
