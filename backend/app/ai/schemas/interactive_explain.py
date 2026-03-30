from pydantic import BaseModel, Field
from typing import Optional, Literal


class ExplainQuestion(BaseModel):
    """Natural language question from committee about AI decision."""
    candidate_id: str
    question: str = Field(..., min_length=10, description="Question about the AI scoring")
    context: Optional[dict] = None  # Current scores, transcript snippets, etc.


class ExplainResponse(BaseModel):
    """AI's answer to committee question."""
    answer: str
    referenced_evidence: list[str]  # Quotes from transcript that support the answer
    confidence: float = Field(..., ge=0, le=1)
    suggested_followup_questions: list[str]


class WhatIfScenario(BaseModel):
    """Hypothetical scenario to explore."""
    candidate_id: str
    hypothetical_change: str = Field(..., min_length=10, description="What if candidate had...")
    dimension_to_analyze: Optional[str] = None  # Specific dimension or "all"


class WhatIfResult(BaseModel):
    """Result of what-if analysis."""
    original_score: float
    hypothetical_score: float
    score_delta: float
    explanation: str
    key_factors: list[str]
    plausibility: float = Field(..., ge=0, le=1, description="How plausible is this scenario")


class CounterfactualExample(BaseModel):
    """Show a similar candidate who scored differently."""
    reference_candidate_id: str
    comparison_candidate_id: str
    dimension: str
    key_differences: list[str]
    lesson: str  # What can be learned from this comparison


class InteractiveExplanationSession(BaseModel):
    """Ongoing explanation session."""
    session_id: str
    candidate_id: str
    committee_member_id: str
    question_history: list[tuple[str, str]]  # (question, answer)
    uncovered_insights: list[str]
    consensus_level: Literal["exploring", "understanding", "convinced", "disagree"]
