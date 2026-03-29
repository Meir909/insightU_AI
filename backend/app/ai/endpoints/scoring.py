from fastapi import APIRouter, HTTPException
import logging
from datetime import datetime, timezone

from app.ai.config import ai_config
from app.ai.schemas.scoring import (
    MultiDimensionalRequest,
    FinalScoreRequest,
    FinalScore,
    CrossValidationResult,
    BehavioralSignals,
)
from app.ai.services.ensemble import EnsembleEngine
from app.ai.services.scoring import MultiDimensionalScorer
from app.ai.base import llm

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/score/multidimensional")
async def score_multidimensional(request: MultiDimensionalRequest):
    """
    Score candidate on multiple dimensions using ensemble approach.
    """
    logger.info(f"[ENDPOINT /score/multidimensional] START | candidate_id={request.candidate_id}")

    try:
        result = await EnsembleEngine.run(request)
        scores = result["scores"]
        breakdown = result["breakdown"]

        used_fallback = "error" in breakdown

        logger.info(f"[ENDPOINT /score/multidimensional] DONE | candidate_id={request.candidate_id}")
        return {
            "scores": scores,
            "breakdown": breakdown,
            "used_fallback": used_fallback,
        }

    except Exception as e:
        logger.error(f"[ENDPOINT /score/multidimensional] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


@router.post("/score/final")
async def score_final(request: FinalScoreRequest):
    """
    Compute final score with cross-validation, behavioral analysis, and ensemble scoring.
    """
    logger.info(f"[ENDPOINT /score/final] START | candidate_id={request.candidate_id}")

    try:
        # 1. EnsembleEngine.run() → dimensional scores
        multi_request = MultiDimensionalRequest(
            candidate_id=request.candidate_id,
            role=request.role,
            interview_transcript=request.interview_transcript,
            essay_text=request.essay_text,
        )
        ensemble_result = await EnsembleEngine.run(multi_request)
        dimensional_scores = ensemble_result["scores"]

        # 2. MultiDimensionalScorer.detect_behavioral_signals()
        behavioral_signals = await MultiDimensionalScorer.detect_behavioral_signals(request.interview_transcript)

        # 3. Cross-validation: run LLM scoring TWICE with different temperatures
        system_prompt = f"""You are an expert evaluator for {request.role} candidates.
Score the candidate on 5 dimensions based on the interview transcript.
Return strict JSON with scores 0-100 for: hard_skills, soft_skills, problem_solving, communication, adaptability.
Format: {{"hard_skills": 75, "soft_skills": 80, ...}}"""

        user_prompt = f"Interview transcript:\n{request.interview_transcript[:3000]}"

        # Pass 1: temperature=0.2 (deterministic)
        pass1_fallback = {"hard_skills": 50, "soft_skills": 50, "problem_solving": 50, "communication": 50, "adaptability": 50}
        try:
            pass1_result, _ = await llm.complete_with_fallback(
                system_prompt, user_prompt, pass1_fallback, temperature=0.2, max_tokens=500
            )
            pass1_scores = {k: pass1_result.get(k, 50) for k in ["hard_skills", "soft_skills", "problem_solving", "communication", "adaptability"]}
        except Exception as e:
            logger.error(f"Cross-validation pass 1 failed: {e}")
            pass1_scores = pass1_fallback

        # Pass 2: temperature=0.5 (more varied)
        pass2_fallback = {"hard_skills": 50, "soft_skills": 50, "problem_solving": 50, "communication": 50, "adaptability": 50}
        try:
            pass2_result, _ = await llm.complete_with_fallback(
                system_prompt, user_prompt, pass2_fallback,
                model=ai_config.openai_validation_model,
                temperature=0.5, max_tokens=500
            )
            pass2_scores = {k: pass2_result.get(k, 50) for k in ["hard_skills", "soft_skills", "problem_solving", "communication", "adaptability"]}
        except Exception as e:
            logger.error(f"Cross-validation pass 2 failed: {e}")
            pass2_scores = pass2_fallback

        # Compare and flag divergent dimensions
        DIMENSIONS = ["hard_skills", "soft_skills", "problem_solving", "communication", "adaptability"]
        flagged = []
        divergence = {}
        for dim in DIMENSIONS:
            diff = abs(pass1_scores[dim] - pass2_scores[dim])
            divergence[dim] = round(diff, 2)
            if diff > ai_config.cross_validation_divergence:
                flagged.append(dim)

        is_consistent = len(flagged) == 0

        cross_validation = CrossValidationResult(
            pass1_scores=pass1_scores,
            pass2_scores=pass2_scores,
            divergence=divergence,
            is_consistent=is_consistent,
            flagged_dimensions=flagged,
        )

        # 4. Compute overall_confidence = mean of all dimension confidences
        confidences = [
            dimensional_scores.hard_skills.confidence,
            dimensional_scores.soft_skills.confidence,
            dimensional_scores.problem_solving.confidence,
            dimensional_scores.communication.confidence,
            dimensional_scores.adaptability.confidence,
        ]
        overall_confidence = sum(confidences) / len(confidences)

        # 5. needs_manual_review conditions
        review_reasons = []
        if overall_confidence < 0.5:
            review_reasons.append("Low overall confidence")
        if not is_consistent:
            review_reasons.append("Cross-validation inconsistency")
        if behavioral_signals.evasiveness_score > 0.7:
            review_reasons.append("High evasiveness detected")

        needs_manual_review = len(review_reasons) > 0

        # 6. Compute weighted total
        weights = ai_config.role_weights.get(request.role.value, ai_config.role_weights["default"])
        weighted_total = (
            dimensional_scores.hard_skills.score * weights["hard_skills"] +
            dimensional_scores.soft_skills.score * weights["soft_skills"] +
            dimensional_scores.problem_solving.score * weights["problem_solving"] +
            dimensional_scores.communication.score * weights["communication"] +
            dimensional_scores.adaptability.score * weights["adaptability"]
        )

        final_score = FinalScore(
            candidate_id=request.candidate_id,
            role=request.role,
            weighted_total=round(weighted_total, 2),
            dimensional_scores=dimensional_scores,
            behavioral_signals=behavioral_signals,
            cross_validation=cross_validation,
            overall_confidence=round(overall_confidence, 3),
            needs_manual_review=needs_manual_review,
            review_reasons=review_reasons,
            ensemble_breakdown=ensemble_result["breakdown"],
        )

        logger.info(f"[ENDPOINT /score/final] DONE | candidate_id={request.candidate_id} weighted_total={weighted_total:.2f}")
        return final_score

    except Exception as e:
        logger.error(f"[ENDPOINT /score/final] ERROR | {str(e)}")
        raise HTTPException(status_code=503, detail="AI service unavailable, please retry")


# ─── EXAMPLE ──────────────────────────────────────────────────────────
# POST /ai/score/multidimensional
# Request:
# {
#   "candidate_id": "cand_abc123",
#   "role": "student_leader",
#   "interview_transcript": "I led a team of 5 students to build...",
#   "essay_text": "My goal is to change education in Kazakhstan..."
# }
# Response:
# {
#   "scores": {
#     "hard_skills": {"score": 45, "confidence": 0.6, "rationale": "...", "evidence": ["..."]},
#     "soft_skills": {"score": 82, "confidence": 0.9, "rationale": "...", "evidence": ["..."]},
#     ...
#   },
#   "used_fallback": false
# }
