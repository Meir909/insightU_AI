from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class DemographicGroup(BaseModel):
    """Demographic group for fairness analysis."""
    group_id: str  # e.g., "female", "under_25", "rural"
    group_attribute: str  # e.g., "gender", "age_group", "region"
    candidate_count: int
    

class GroupMetrics(BaseModel):
    """Metrics for a demographic group."""
    group: DemographicGroup
    mean_score: float
    median_score: float
    std_score: float
    min_score: float
    max_score: float
    selection_rate: float  # % above threshold
    positive_outcome_rate: float  # % shortlisted


class DisparateImpactResult(BaseModel):
    """80% rule analysis result."""
    reference_group: str  # Group with highest rate
    comparison_group: str
    reference_rate: float
    comparison_rate: float
    ratio: float  # comparison / reference
    four_fifths_rule_violated: bool  # ratio < 0.8
    severity: Literal["none", "minor", "moderate", "severe"]
    recommendation: str


class EqualizedOddsResult(BaseModel):
    """Equalized odds (equal TPR and FPR across groups)."""
    group_id: str
    true_positive_rate: float  # Sensitivity
    false_positive_rate: float  # 1 - Specificity
    deviation_from_average: float


class CalibrationResult(BaseModel):
    """Calibration - scores should mean same thing across groups."""
    score_bin: str  # e.g., "70-80"
    expected_outcome_rate: float  # What score predicts
    actual_outcome_rate_by_group: dict[str, float]  # What actually happens
    calibration_error: float


class FairnessAuditRequest(BaseModel):
    """Request for comprehensive fairness audit."""
    candidate_ids: list[str]
    demographic_attributes: dict[str, str]  # candidate_id -> attribute value
    protected_attributes: list[str]  # Which attributes to check (e.g., ["gender", "region"])
    score_threshold: float = 70.0  # Threshold for "positive outcome"


class FairnessAuditResult(BaseModel):
    """Comprehensive fairness audit results."""
    audit_timestamp: datetime
    total_candidates: int
    
    # Group metrics
    group_metrics: list[GroupMetrics]
    
    # Disparate impact
    disparate_impact_results: list[DisparateImpactResult]
    disparate_impact_summary: str
    
    # Equalized odds (requires historical outcomes)
    equalized_odds: Optional[list[EqualizedOddsResult]]
    
    # Calibration
    calibration_by_group: Optional[list[CalibrationResult]]
    
    # Overall fairness verdict
    overall_fairness_score: float = Field(..., ge=0, le=1)
    fairness_rating: Literal["excellent", "good", "fair", "poor", "biased"]
    critical_issues: list[str]
    recommendations: list[str]


class BiasMitigationStrategy(BaseModel):
    """Strategy to mitigate detected bias."""
    bias_type: str
    affected_groups: list[str]
    current_disparity: float
    suggested_adjustment: str  # e.g., "increase weight of soft_skills by 10%"
    expected_improvement: float
