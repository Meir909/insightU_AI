from pydantic_settings import BaseSettings
from typing import Literal


class AIConfig(BaseSettings):
    # LLM
    openai_api_key: str
    openai_primary_model: str = "gpt-4o"
    openai_fallback_model: str = "gpt-4o-mini"  # cheaper fallback
    openai_validation_model: str = "gpt-4o-mini"  # for cross-validation pass

    # Thresholds
    ai_detection_threshold: float = 0.72  # above = likely AI-generated
    confidence_min_threshold: float = 0.50  # below = flag for manual review
    cross_validation_divergence: float = 15.0  # score diff > this = inconsistent
    depth_shallow_threshold: float = 0.35
    depth_deep_threshold: float = 0.70
    bias_zscore_threshold: float = 2.0  # z-score for outlier committee votes

    # Scoring weights per role
    role_weights: dict = {
        "default": {
            "hard_skills": 0.25,
            "soft_skills": 0.20,
            "problem_solving": 0.25,
            "communication": 0.15,
            "adaptability": 0.15,
        },
        "backend_engineer": {
            "hard_skills": 0.40,
            "soft_skills": 0.10,
            "problem_solving": 0.30,
            "communication": 0.10,
            "adaptability": 0.10,
        },
        "student_leader": {  # inVision U profile
            "hard_skills": 0.10,
            "soft_skills": 0.25,
            "problem_solving": 0.25,
            "communication": 0.20,
            "adaptability": 0.20,
        },
        "driver": {
            "hard_skills": 0.15,
            "soft_skills": 0.20,
            "problem_solving": 0.20,
            "communication": 0.25,
            "adaptability": 0.20,
        },
        "support": {
            "hard_skills": 0.10,
            "soft_skills": 0.30,
            "problem_solving": 0.20,
            "communication": 0.30,
            "adaptability": 0.10,
        },
    }

    class Config:
        env_file = ".env"
        extra = "ignore"


ai_config = AIConfig()
