from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class PrivacyLevel(str, Enum):
    """Privacy levels for scoring."""
    STANDARD = "standard"  # Normal processing
    ANONYMIZED = "anonymized"  # Remove PII before AI processing
    DIFFERENTIAL_PRIVACY = "differential_privacy"  # Add noise to results
    FEDERATED = "federated"  # Local processing only, no data leaves


class AnonymizationConfig(BaseModel):
    """Configuration for text anonymization."""
    remove_names: bool = True
    remove_locations: bool = True
    remove_organizations: bool = True
    remove_emails: bool = True
    remove_phones: bool = True
    remove_dates: bool = False  # Keep dates as they may be relevant
    replacement_strategy: str = "[REDACTED]"  # Or use pseudonyms


class PrivacyScoringRequest(BaseModel):
    """Request for privacy-preserving scoring."""
    candidate_id: str
    role: str = "default"
    interview_transcript: str
    essay_text: Optional[str] = None
    privacy_level: PrivacyLevel = PrivacyLevel.ANONYMIZED
    anonymization_config: Optional[AnonymizationConfig] = None
    epsilon: Optional[float] = Field(None, ge=0.1, le=10.0, description="Differential privacy epsilon parameter")


class AnonymizationResult(BaseModel):
    """Result of anonymization process."""
    original_length: int
    anonymized_length: int
    entities_removed: dict[str, int]  # Entity type -> count
    sample_before: str  # Short sample before anonymization
    sample_after: str  # Same sample after anonymization


class PrivacyScoringResult(BaseModel):
    """Result of privacy-preserving scoring."""
    candidate_id: str
    privacy_level: PrivacyLevel
    anonymization_info: Optional[AnonymizationResult]
    
    # Scores (may have noise added)
    hard_skills: float = Field(..., ge=0, le=100)
    soft_skills: float = Field(..., ge=0, le=100)
    problem_solving: float = Field(..., ge=0, le=100)
    communication: float = Field(..., ge=0, le=100)
    adaptability: float = Field(..., ge=0, le=100)
    overall_score: float = Field(..., ge=0, le=100)
    
    # Privacy metrics
    noise_added: Optional[float] = None  # Amount of noise added
    epsilon_used: Optional[float] = None
    confidence: float = Field(..., ge=0, le=1)
    privacy_guarantee: str  # Description of privacy protection applied
    
    # Trust indicators
    data_residency: str = "processed_locally"  # Where processing happened
    third_party_access: list[str] = Field(default_factory=list)  # Which services accessed data
