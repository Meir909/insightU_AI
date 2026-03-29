from pydantic import BaseModel, Field


class CommitteeVote(BaseModel):
    member_id: str
    candidate_id: str
    vote: str  # "approve" | "reject" | "hold"
    score: float = Field(..., ge=0, le=100)
    justification: str = Field(..., min_length=30, description="Required explanation")


class BiasCheckRequest(BaseModel):
    candidate_id: str
    votes: list[CommitteeVote]


class BiasCheckResult(BaseModel):
    candidate_id: str
    has_anomaly: bool
    outlier_voters: list[str]
    z_scores: dict[str, float]
    score_variance: float
    recommendation: str
    details: str
