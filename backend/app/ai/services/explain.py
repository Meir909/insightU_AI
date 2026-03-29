import logging
from datetime import datetime, timezone
from app.ai.base import llm
from app.ai.schemas.scoring import FinalScore

logger = logging.getLogger(__name__)


class ExplainabilityEngine:
    """
    Generates explainability reports for hiring decisions.
    """

    @staticmethod
    async def generate(candidate_id: str, final_score: FinalScore) -> dict:
        """
        Generate an explainability report for a candidate's final score.
        """
        logger.info(f"[ExplainabilityEngine.generate] START | candidate_id={candidate_id}")

        # Build score summary
        score_summary = {
            "candidate_id": candidate_id,
            "role": final_score.role,
            "weighted_total": final_score.weighted_total,
            "dimensional_scores": {
                "hard_skills": {
                    "score": final_score.dimensional_scores.hard_skills.score,
                    "confidence": final_score.dimensional_scores.hard_skills.confidence,
                },
                "soft_skills": {
                    "score": final_score.dimensional_scores.soft_skills.score,
                    "confidence": final_score.dimensional_scores.soft_skills.confidence,
                },
                "problem_solving": {
                    "score": final_score.dimensional_scores.problem_solving.score,
                    "confidence": final_score.dimensional_scores.problem_solving.confidence,
                },
                "communication": {
                    "score": final_score.dimensional_scores.communication.score,
                    "confidence": final_score.dimensional_scores.communication.confidence,
                },
                "adaptability": {
                    "score": final_score.dimensional_scores.adaptability.score,
                    "confidence": final_score.dimensional_scores.adaptability.confidence,
                },
            },
            "behavioral_signals": {
                "confidence_level": final_score.behavioral_signals.confidence_level,
                "hesitation_detected": final_score.behavioral_signals.hesitation_detected,
                "evasiveness_score": final_score.behavioral_signals.evasiveness_score,
            },
            "overall_confidence": final_score.overall_confidence,
            "needs_manual_review": final_score.needs_manual_review,
            "review_reasons": final_score.review_reasons,
        }

        system_prompt = f"""You are generating an explainability report for a hiring decision.
Be factual. Reference actual evidence. Be concise.

Candidate data: {score_summary}

Generate a structured explanation with:
1. Overall verdict (2 sentences)
2. Top 3 strengths (with evidence from transcript)
3. Top 3 concerns (with evidence)
4. Hiring recommendation: "strong_yes" | "yes" | "hold" | "no"
5. Suggested interview follow-up topics (if hold)

Return JSON:
{{
  "verdict_summary": str,
  "strengths": [{{"area": str, "evidence": str}}],
  "concerns": [{{"area": str, "evidence": str}}],
  "recommendation": str,
  "follow_up_topics": [str]
}}"""

        user_prompt = "Generate the explainability report based on the candidate evaluation data provided in the system prompt."

        fallback = {
            "verdict_summary": "Unable to generate detailed explanation due to service error.",
            "strengths": [],
            "concerns": [{"area": "Evaluation incomplete", "evidence": "Error during report generation"}],
            "recommendation": "hold",
            "follow_up_topics": ["Re-evaluate candidate"],
        }

        try:
            result, used_fallback = await llm.complete_with_fallback(
                system_prompt, user_prompt, fallback, temperature=0.2, max_tokens=1500
            )

            explanation = {
                "explanation": result,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "candidate_id": candidate_id,
            }

            logger.info(f"[ExplainabilityEngine.generate] DONE | recommendation={result.get('recommendation', 'unknown')}")
            return explanation

        except Exception as e:
            logger.error(f"[ExplainabilityEngine.generate] AI FAILURE | error={str(e)} | returning fallback")
            return {
                "explanation": fallback,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "candidate_id": candidate_id,
                "error": str(e),
            }
