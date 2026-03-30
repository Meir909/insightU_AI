from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional


class CommitteeOverride(BaseModel):
    """When committee disagrees with AI assessment."""
    candidate_id: str
    committee_member_id: str
    ai_score: float = Field(..., ge=0, le=100)
    committee_score: float = Field(..., ge=0, le=100)
    disagreement_type: Literal["overscored", "underscored", "dimension_mismatch", "other"]
    specific_dimensions: list[str] = Field(default_factory=list)  # Which dimensions caused disagreement
    committee_reasoning: str = Field(..., min_length=20, description="Why committee disagrees")
    ai_missed_signals: list[str] = Field(default_factory=list)  # What AI overlooked
    ai_false_positives: list[str] = Field(default_factory=list)  # What AI overvalued
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ScoreAdjustment(BaseModel):
    """Proposed adjustment to AI scoring based on committee feedback."""
    dimension: str
    original_ai_score: float = Field(..., ge=0, le=100)
    proposed_score: float = Field(..., ge=0, le=100)
    justification: str


class CommitteeCalibrationSession(BaseModel):
    """Session to calibrate AI with committee expectations."""
    session_id: str
    committee_member_id: str
    reviewed_candidates: list[str]  # Candidate IDs reviewed
    average_agreement_rate: float = Field(..., ge=0, le=1)  # How often committee agrees with AI
    systematic_biases_detected: list[str]  # e.g., ["ai_overvalues_technical_skills"]
    calibration_notes: str


class FeedbackSummary(BaseModel):
    """Aggregated feedback statistics."""
    total_overrides: int
    agreement_rate: float  # % of times committee agrees with AI
    most_common_disagreement: str
    top_missed_signals: list[tuple[str, int]]  # Signal type and count
    recommended_ai_tweaks: list[str]
