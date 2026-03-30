from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ScoreDistribution(BaseModel):
    """Distribution of scores for drift detection."""
    mean: float
    median: float
    std: float
    min: float
    max: float
    percentile_25: float
    percentile_75: float
    sample_size: int


class DriftDetectionResult(BaseModel):
    """Result of data drift detection."""
    drift_detected: bool
    drift_type: str  # "score_distribution", "feature_distribution", "concept_drift"
    severity: str  # "none", "low", "medium", "high"
    reference_stats: ScoreDistribution
    current_stats: ScoreDistribution
    p_value: Optional[float] = None
    ks_statistic: Optional[float] = None  # Kolmogorov-Smirnov test
    psi_score: Optional[float] = None  # Population Stability Index
    recommendation: str


class ConfidenceTrend(BaseModel):
    """Trend in AI confidence scores."""
    period: str  # e.g., "last_7_days", "last_30_candidates"
    avg_confidence: float
    trend_direction: str  # "increasing", "stable", "decreasing"
    confidence_std: float
    low_confidence_rate: float  # % of predictions with confidence < 0.5


class HumanAIAgreementMetrics(BaseModel):
    """Metrics on agreement between AI and human committee."""
    total_evaluated: int
    agreement_rate: float  # % within 10 points
    average_difference: float  # Mean absolute difference
    correlation_coefficient: Optional[float] = None
    systematic_bias: str  # "ai_higher", "ai_lower", "none"


class ModelHealthMetrics(BaseModel):
    """Overall model health metrics."""
    timestamp: datetime
    model_version: str = "v2.0"
    
    # Score distribution
    score_distribution: ScoreDistribution
    
    # Drift
    drift_status: DriftDetectionResult
    
    # Confidence
    confidence_trend: ConfidenceTrend
    
    # Agreement
    human_ai_agreement: HumanAIAgreementMetrics
    
    # System health
    avg_response_time_ms: Optional[float] = None
    error_rate: Optional[float] = None
    fallback_usage_rate: Optional[float] = None
    
    # Overall health
    overall_health: str  # "healthy", "degraded", "critical"
    warnings: list[str]
    recommendations: list[str]
