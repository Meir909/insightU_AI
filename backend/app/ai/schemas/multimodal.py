from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class FormData(BaseModel):
    """Structured form data from application."""
    education_level: Optional[str] = None
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    previous_roles: list[str] = Field(default_factory=list)
    skills_declared: list[str] = Field(default_factory=list)
    achievements_count: Optional[int] = Field(None, ge=0)
    references_provided: bool = False
    completion_time_seconds: Optional[int] = None  # Time to fill form


class BehavioralMeta(BaseModel):
    """Behavioral metadata captured during application/interview."""
    form_completion_time_ms: Optional[int] = None
    time_between_questions_ms: list[int] = Field(default_factory=list)
    edit_count: Optional[int] = None  # How many times edited answers
    session_duration_minutes: Optional[float] = None
    device_type: Optional[Literal["mobile", "desktop", "tablet"]] = None
    source_referral: Optional[str] = None


class MultiModalFusionRequest(BaseModel):
    """Request for multi-modal fusion scoring."""
    candidate_id: str
    role: str = "default"
    form_data: Optional[FormData] = None
    essay_text: Optional[str] = Field(None, min_length=10)
    interview_transcript: Optional[str] = Field(None, min_length=50)
    behavioral_meta: Optional[BehavioralMeta] = None


class ModalScore(BaseModel):
    """Score from individual modality."""
    modality: str  # "form", "essay", "interview", "behavioral"
    available: bool
    completeness: float = Field(..., ge=0, le=1)  # How complete is this modality
    hard_skills: float = Field(..., ge=0, le=100)
    soft_skills: float = Field(..., ge=0, le=100)
    problem_solving: float = Field(..., ge=0, le=100)
    communication: float = Field(..., ge=0, le=100)
    adaptability: float = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=1)
    raw_data_summary: str  # Brief description of what was analyzed


class MultiModalFusionResult(BaseModel):
    """Result of multi-modal fusion scoring."""
    candidate_id: str
    role: str
    final_scores: dict[str, float]  # Dimension -> score
    overall_score: float = Field(..., ge=0, le=100)
    per_modality: list[ModalScore]
    fusion_weights: dict[str, float]  # How much each modality contributed
    data_quality_score: float = Field(..., ge=0, le=1)  # Overall completeness
    recommendation: str  # "strong_candidate", "promising", "needs_review", "insufficient_data"
