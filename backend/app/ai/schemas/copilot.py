from pydantic import BaseModel, Field


class FollowUpRequest(BaseModel):
    session_id: str
    role: str = "default"
    previous_qa: list[dict] = Field(..., description="[{question, answer}]")
    weak_areas: list[str] = Field(default_factory=list)
    current_scores: dict | None = None


class FollowUpResponse(BaseModel):
    session_id: str
    suggested_question: str
    target_dimension: str
    reasoning: str
    urgency: str  # "critical" | "recommended" | "optional"


class ThinkingStyleRequest(BaseModel):
    text: str = Field(..., min_length=30)


class ThinkingStyleResult(BaseModel):
    thinking_style: str
    human_markers: list[str]
    ai_markers: list[str]
    confidence: float
