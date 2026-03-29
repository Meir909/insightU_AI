from pydantic import BaseModel, Field


class AIDetectionSignals(BaseModel):
    entropy_score: float = Field(..., ge=0, le=1, description="Low = AI-like")
    burstiness: float = Field(..., ge=0, le=1, description="Low = AI-like")
    lexical_diversity: float = Field(..., ge=0, le=1)
    over_structured: bool
    unnatural_perfection: bool
    template_phrases_found: list[str]
    llm_verdict_probability: float = Field(..., ge=0, le=1)


class AIDetectionResult(BaseModel):
    text_id: str
    final_probability: float = Field(..., ge=0, le=1)
    verdict: str  # "likely_human" | "uncertain" | "likely_ai"
    signals: AIDetectionSignals
    used_fallback: bool = False


class AIDetectionRequest(BaseModel):
    text_id: str
    text: str = Field(..., min_length=50)


class ResourceValidationRequest(BaseModel):
    candidate_id: str
    github_url: str | None = None
    portfolio_url: str | None = None
    linkedin_url: str | None = None
    uploaded_file_ids: list[str] = Field(default_factory=list)


class ResourceValidationResult(BaseModel):
    candidate_id: str
    github_valid: bool | None = None
    github_activity_score: float | None = None
    portfolio_reachable: bool | None = None
    overall_authenticity_score: float
    red_flags: list[str]
    notes: str
