import logging
from typing import Optional
from app.ai.schemas.multimodal import (
    MultiModalFusionRequest,
    MultiModalFusionResult,
    ModalScore,
    FormData,
    BehavioralMeta,
)
from app.ai.schemas.scoring import MultiDimensionalRequest, MultiDimensionalScore, DimensionScore
from app.ai.services.ensemble import EnsembleEngine
from app.ai.services.scoring import MultiDimensionalScorer

logger = logging.getLogger(__name__)


class MultiModalFusion:
    """
    Combines multiple data sources (form, essay, interview, behavioral) 
    into unified candidate scoring with adaptive weights.
    """

    # Default weights when all modalities present
    DEFAULT_WEIGHTS = {
        "form": 0.15,
        "essay": 0.25,
        "interview": 0.50,
        "behavioral": 0.10,
    }

    @staticmethod
    def _calculate_completeness(data: Optional[FormData]) -> float:
        """Calculate completeness of form data (0-1)."""
        if not data:
            return 0.0
        
        fields = [
            data.education_level is not None,
            data.years_experience is not None,
            len(data.previous_roles) > 0,
            len(data.skills_declared) > 0,
            data.achievements_count is not None,
            data.references_provided,
        ]
        return sum(fields) / len(fields)

    @staticmethod
    def _score_form(data: Optional[FormData]) -> Optional[ModalScore]:
        """Score based on structured form data."""
        if not data:
            return None

        completeness = MultiModalFusion._calculate_completeness(data)
        
        # Simple rule-based scoring from form fields
        hard_skills = min(100, 40 + (data.years_experience or 0) * 3 + len(data.skills_declared) * 5)
        soft_skills = min(100, 50 + len(data.previous_roles) * 5 + (10 if data.references_provided else 0))
        problem_solving = min(100, 45 + (data.achievements_count or 0) * 8)
        communication = 65  # Default for form-only
        adaptability = min(100, 50 + (data.years_experience or 0) * 2)

        return ModalScore(
            modality="form",
            available=True,
            completeness=completeness,
            hard_skills=round(hard_skills, 2),
            soft_skills=round(soft_skills, 2),
            problem_solving=round(problem_solving, 2),
            communication=round(communication, 2),
            adaptability=round(adaptability, 2),
            confidence=0.4 + completeness * 0.4,  # 0.4-0.8 based on completeness
            raw_data_summary=f"Education: {data.education_level or 'N/A'}, Experience: {data.years_experience or 0} years, Skills: {len(data.skills_declared)}",
        )

    @staticmethod
    def _score_essay(text: Optional[str]) -> Optional[ModalScore]:
        """Score based on essay text using AI."""
        if not text or len(text) < 10:
            return None

        # Use AI to score essay
        from app.ai.base import llm
        
        system_prompt = """Score this essay on 5 dimensions (0-100 each):
- hard_skills: technical competence shown
- soft_skills: interpersonal qualities
- problem_solving: analytical thinking
- communication: clarity and structure
- adaptability: learning mindset and flexibility

Return JSON: {"hard_skills": int, "soft_skills": int, "problem_solving": int, "communication": int, "adaptability": int}"""

        fallback = {"hard_skills": 50, "soft_skills": 50, "problem_solving": 50, "communication": 50, "adaptability": 50}
        
        try:
            result, _ = llm.complete_with_fallback(system_prompt, text[:2000], fallback, max_tokens=300)
            scores = {k: max(0, min(100, result.get(k, 50))) for k in fallback.keys()}
        except Exception:
            scores = fallback

        return ModalScore(
            modality="essay",
            available=True,
            completeness=min(1.0, len(text) / 500),  # Full completeness at 500+ chars
            hard_skills=scores["hard_skills"],
            soft_skills=scores["soft_skills"],
            problem_solving=scores["problem_solving"],
            communication=scores["communication"],
            adaptability=scores["adaptability"],
            confidence=0.5 + min(1.0, len(text) / 1000) * 0.3,  # 0.5-0.8 based on length
            raw_data_summary=f"Essay length: {len(text)} chars",
        )

    @staticmethod
    async def _score_interview(transcript: Optional[str]) -> Optional[ModalScore]:
        """Score based on interview transcript using AI."""
        if not transcript or len(transcript) < 50:
            return None

        # Use EnsembleEngine for interview scoring
        request = MultiDimensionalRequest(
            candidate_id="temp",
            role="default",
            interview_transcript=transcript,
        )
        result = await EnsembleEngine.run(request)
        scores = result["scores"]

        return ModalScore(
            modality="interview",
            available=True,
            completeness=min(1.0, len(transcript) / 2000),  # Full at 2000+ chars
            hard_skills=scores.hard_skills.score,
            soft_skills=scores.soft_skills.score,
            problem_solving=scores.problem_solving.score,
            communication=scores.communication.score,
            adaptability=scores.adaptability.score,
            confidence=sum([
                scores.hard_skills.confidence,
                scores.soft_skills.confidence,
                scores.problem_solving.confidence,
                scores.communication.confidence,
                scores.adaptability.confidence,
            ]) / 5,
            raw_data_summary=f"Interview transcript: {len(transcript)} chars",
        )

    @staticmethod
    def _score_behavioral(meta: Optional[BehavioralMeta]) -> Optional[ModalScore]:
        """Score based on behavioral metadata."""
        if not meta:
            return None

        # Analyze patterns in behavioral data
        signals = {
            "careful_completion": meta.completion_time_ms and meta.completion_time_ms > 300000,  # > 5 min
            "thorough_editing": meta.edit_count and meta.edit_count > 3,
            "consistent_engagement": len(meta.time_between_questions_ms) > 0 and 
                                   sum(meta.time_between_questions_ms) / max(len(meta.time_between_questions_ms), 1) > 10000,  # > 10s avg
        }

        # Higher engagement = better soft skills and adaptability signals
        engagement_score = sum(signals.values()) / len(signals) * 100 if signals else 50

        return ModalScore(
            modality="behavioral",
            available=True,
            completeness=sum([meta.completion_time_ms is not None, 
                            meta.edit_count is not None,
                            len(meta.time_between_questions_ms) > 0]) / 3,
            hard_skills=50,  # Hard to tell from behavior alone
            soft_skills=50 + engagement_score * 0.3,
            problem_solving=50 + (20 if signals.get("careful_completion") else 0),
            communication=50 + engagement_score * 0.4,
            adaptability=50 + engagement_score * 0.5,
            confidence=0.3,  # Lower confidence as this is indirect
            raw_data_summary=f"Completion time: {meta.completion_time_ms or 'N/A'}ms, Edits: {meta.edit_count or 'N/A'}",
        )

    @staticmethod
    def _normalize_weights(weights: dict[str, float], available: dict[str, bool]) -> dict[str, float]:
        """Normalize weights based on available modalities."""
        # Zero out unavailable modalities
        adjusted = {k: v if available.get(k, False) else 0 for k, v in weights.items()}
        total = sum(adjusted.values())
        
        if total == 0:
            return {k: 0.25 for k in weights}  # Equal if nothing available
        
        return {k: v / total for k, v in adjusted.items()}

    @staticmethod
    async def fusion_score(request: MultiModalFusionRequest) -> MultiModalFusionResult:
        """
        Combine all available modalities into unified score.
        """
        logger.info(f"[MultiModalFusion.fusion_score] START | candidate_id={request.candidate_id}")

        # Score each modality
        form_score = MultiModalFusion._score_form(request.form_data)
        essay_score = MultiModalFusion._score_essay(request.essay_text)
        interview_score = await MultiModalFusion._score_interview(request.interview_transcript)
        behavioral_score = MultiModalFusion._score_behavioral(request.behavioral_meta)

        scores = [s for s in [form_score, essay_score, interview_score, behavioral_score] if s]
        
        # Track availability
        available = {
            "form": form_score is not None,
            "essay": essay_score is not None,
            "interview": interview_score is not None,
            "behavioral": behavioral_score is not None,
        }

        # Normalize weights
        weights = MultiModalFusion._normalize_weights(MultiModalFusion.DEFAULT_WEIGHTS, available)

        # Calculate fused scores
        final_scores = {}
        dimensions = ["hard_skills", "soft_skills", "problem_solving", "communication", "adaptability"]
        
        for dim in dimensions:
            weighted_sum = sum(
                getattr(s, dim) * weights.get(s.modality, 0) 
                for s in scores
            )
            final_scores[dim] = round(weighted_sum, 2)

        # Overall score
        overall = sum(final_scores.values()) / len(final_scores)

        # Data quality score
        data_quality = sum(s.completeness * weights.get(s.modality, 0) for s in scores)

        # Recommendation
        if data_quality < 0.3:
            recommendation = "insufficient_data"
        elif overall >= 80:
            recommendation = "strong_candidate"
        elif overall >= 65:
            recommendation = "promising"
        else:
            recommendation = "needs_review"

        result = MultiModalFusionResult(
            candidate_id=request.candidate_id,
            role=request.role,
            final_scores=final_scores,
            overall_score=round(overall, 2),
            per_modality=scores,
            fusion_weights=weights,
            data_quality_score=round(data_quality, 3),
            recommendation=recommendation,
        )

        logger.info(f"[MultiModalFusion.fusion_score] DONE | overall={overall:.2f} recommendation={recommendation}")
        return result
