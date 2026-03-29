from pydantic import BaseModel, Field, field_validator
from typing import Literal
from enum import Enum


class RoleType(str, Enum):
    DEFAULT = "default"
    BACKEND_ENGINEER = "backend_engineer"
    STUDENT_LEADER = "student_leader"
    DRIVER = "driver"
    SUPPORT = "support"


class DimensionScore(BaseModel):
    score: float = Field(..., ge=0, le=100, description="Score 0-100")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in this score")
    rationale: str = Field(..., description="Why this score was given")
    evidence: list[str] = Field(default_factory=list, description="Quotes from candidate")


class MultiDimensionalScore(BaseModel):
    hard_skills: DimensionScore
    soft_skills: DimensionScore
    problem_solving: DimensionScore
    communication: DimensionScore
    adaptability: DimensionScore


class BehavioralSignals(BaseModel):
    confidence_level: float = Field(..., ge=0, le=1)
    hesitation_detected: bool
    evasiveness_score: float = Field(..., ge=0, le=1)
    behavioral_flags: list[str] = Field(default_factory=list)


class CrossValidationResult(BaseModel):
    pass1_scores: dict[str, float]
    pass2_scores: dict[str, float]
    divergence: dict[str, float]  # abs diff per dimension
    is_consistent: bool
    flagged_dimensions: list[str]


class FinalScore(BaseModel):
    candidate_id: str
    role: RoleType
    weighted_total: float = Field(..., ge=0, le=100)
    dimensional_scores: MultiDimensionalScore
    behavioral_signals: BehavioralSignals
    cross_validation: CrossValidationResult
    overall_confidence: float = Field(..., ge=0, le=1)
    needs_manual_review: bool
    review_reasons: list[str]
    ensemble_breakdown: dict  # llm, rule, keyword contributions


class MultiDimensionalRequest(BaseModel):
    candidate_id: str
    role: RoleType = RoleType.DEFAULT
    interview_transcript: str = Field(..., min_length=50)
    essay_text: str | None = None
    context: dict | None = None


class FinalScoreRequest(BaseModel):
    candidate_id: str
    role: RoleType = RoleType.DEFAULT
    interview_transcript: str
    essay_text: str | None = None
    portfolio_urls: list[str] = Field(default_factory=list)
