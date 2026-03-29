from pydantic import BaseModel, Field
from typing import Literal
from enum import Enum


class AnswerDepth(str, Enum):
    SHALLOW = "shallow"
    MEDIUM = "medium"
    DEEP = "deep"


class ThinkingStyle(str, Enum):
    HUMAN_ANALYTICAL = "human_analytical"
    HUMAN_INTUITIVE = "human_intuitive"
    HUMAN_NARRATIVE = "human_narrative"
    AI_PATTERNED = "ai_patterned"
    MIXED = "mixed"


class SingleAnswerAnalysis(BaseModel):
    question: str
    answer: str
    depth: AnswerDepth
    depth_score: float = Field(..., ge=0, le=1)
    thinking_style: ThinkingStyle
    behavioral_signals: dict
    dimensional_deltas: dict[str, float]  # how this answer affects each dimension
    weak_areas: list[str]
    strong_areas: list[str]


class InterviewAnalysisRequest(BaseModel):
    session_id: str
    candidate_id: str
    role: str = "default"
    question: str
    answer: str
    previous_qa: list[dict] = Field(default_factory=list, description="[{question, answer}]")
    current_scores: dict | None = None  # running scores so far


class InterviewAnalysisResponse(BaseModel):
    session_id: str
    analysis: SingleAnswerAnalysis
    updated_scores: dict[str, float]  # cumulative running scores
    session_progress: float = Field(..., ge=0, le=1)  # 0.0-1.0 completeness
