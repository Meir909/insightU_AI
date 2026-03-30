import logging
from typing import Optional
from app.ai.base import llm
from app.ai.schemas.interactive_explain import (
    ExplainQuestion,
    ExplainResponse,
    WhatIfScenario,
    WhatIfResult,
    CounterfactualExample,
)
from app.ai.schemas.scoring import FinalScore, MultiDimensionalScore

logger = logging.getLogger(__name__)


class InteractiveExplainer:
    """
    Interactive explanation system that allows committee to ask questions
    about AI decisions and explore what-if scenarios.
    """

    @staticmethod
    async def answer_committee_question(
        question: ExplainQuestion,
        final_score: FinalScore,
        transcript: str
    ) -> ExplainResponse:
        """
        Answer a natural language question from committee about AI decision.
        """
        logger.info(f"[InteractiveExplainer.answer_committee_question] START | candidate={question.candidate_id}")

        # Build context from final score
        score_context = {
            "weighted_total": final_score.weighted_total,
            "dimensions": {
                "hard_skills": {
                    "score": final_score.dimensional_scores.hard_skills.score,
                    "rationale": final_score.dimensional_scores.hard_skills.rationale,
                    "evidence": final_score.dimensional_scores.hard_skills.evidence,
                },
                "soft_skills": {
                    "score": final_score.dimensional_scores.soft_skills.score,
                    "rationale": final_score.dimensional_scores.soft_skills.rationale,
                    "evidence": final_score.dimensional_scores.soft_skills.evidence,
                },
                "problem_solving": {
                    "score": final_score.dimensional_scores.problem_solving.score,
                    "rationale": final_score.dimensional_scores.problem_solving.rationale,
                    "evidence": final_score.dimensional_scores.problem_solving.evidence,
                },
                "communication": {
                    "score": final_score.dimensional_scores.communication.score,
                    "rationale": final_score.dimensional_scores.communication.rationale,
                    "evidence": final_score.dimensional_scores.communication.evidence,
                },
                "adaptability": {
                    "score": final_score.dimensional_scores.adaptability.score,
                    "rationale": final_score.dimensional_scores.adaptability.rationale,
                    "evidence": final_score.dimensional_scores.adaptability.evidence,
                },
            },
            "behavioral_signals": {
                "confidence": final_score.behavioral_signals.confidence_level,
                "hesitation": final_score.behavioral_signals.hesitation_detected,
                "evasiveness": final_score.behavioral_signals.evasiveness_score,
            },
        }

        system_prompt = f"""You are an AI assistant explaining hiring decisions to a committee.
Be factual, cite specific evidence from the transcript, and be helpful.

Candidate Scoring Data:
{score_context}

Guidelines:
- Always reference specific quotes from the transcript as evidence
- Explain trade-offs between dimensions
- If asked about low scores, explain what was missing
- If asked about high scores, highlight what was demonstrated well
- Suggest what additional evidence could change the assessment

Answer the committee's question directly and concisely."""

        user_prompt = f"Committee Question: {question.question}\n\nTranscript:\n{transcript[:2000]}"

        fallback = {
            "answer": "I apologize, but I'm unable to analyze this specific question at the moment. Please review the dimensional scores and evidence provided in the main report.",
            "referenced_evidence": [],
            "confidence": 0.3,
            "suggested_followup_questions": [
                "What specific evidence supports the soft skills score?",
                "Why was the problem solving score lower than expected?",
                "What would improve this candidate's overall assessment?"
            ]
        }

        try:
            result, used_fallback = await llm.complete_with_fallback(
                system_prompt, user_prompt, fallback, temperature=0.3, max_tokens=800
            )

            response = ExplainResponse(
                answer=result.get("answer", fallback["answer"]),
                referenced_evidence=result.get("referenced_evidence", fallback["referenced_evidence"]),
                confidence=result.get("confidence", 0.5),
                suggested_followup_questions=result.get("suggested_followup_questions", fallback["suggested_followup_questions"]),
            )

            logger.info(f"[InteractiveExplainer.answer_committee_question] DONE | confidence={response.confidence}")
            return response

        except Exception as e:
            logger.error(f"[InteractiveExplainer.answer_committee_question] AI FAILURE | error={str(e)}")
            return ExplainResponse(
                answer=fallback["answer"],
                referenced_evidence=fallback["referenced_evidence"],
                confidence=fallback["confidence"],
                suggested_followup_questions=fallback["suggested_followup_questions"],
            )

    @staticmethod
    async def what_if_analysis(
        scenario: WhatIfScenario,
        current_scores: MultiDimensionalScore
    ) -> WhatIfResult:
        """
        Show how scores would change under hypothetical conditions.
        """
        logger.info(f"[InteractiveExplainer.what_if_analysis] START | candidate={scenario.candidate_id}")

        # Current scores dict
        current = {
            "hard_skills": current_scores.hard_skills.score,
            "soft_skills": current_scores.soft_skills.score,
            "problem_solving": current_scores.problem_solving.score,
            "communication": current_scores.communication.score,
            "adaptability": current_scores.adaptability.score,
        }
        current_overall = sum(current.values()) / len(current)

        system_prompt = f"""You are analyzing a hypothetical scenario for candidate evaluation.
Current scores: {current}

Estimate how the candidate's scores would change IF the hypothetical scenario were true.
Be realistic - small improvements in specific dimensions, not dramatic changes across all.

Return JSON:
{{
  "hypothetical_scores": {{
    "hard_skills": float (0-100),
    "soft_skills": float (0-100),
    "problem_solving": float (0-100),
    "communication": float (0-100),
    "adaptability": float (0-100)
  }},
  "explanation": str,
  "key_factors": [str],
  "plausibility": float (0-1, how realistic is this scenario)
}}"""

        user_prompt = f"Hypothetical scenario: {scenario.hypothetical_change}"

        fallback = {
            "hypothetical_scores": current,
            "explanation": "Unable to analyze this scenario due to service error.",
            "key_factors": [],
            "plausibility": 0.5,
        }

        try:
            result, _ = await llm.complete_with_fallback(
                system_prompt, user_prompt, fallback, temperature=0.3, max_tokens=600
            )

            hypo_scores = result.get("hypothetical_scores", current)
            hypo_overall = sum(hypo_scores.values()) / len(hypo_scores)

            response = WhatIfResult(
                original_score=round(current_overall, 2),
                hypothetical_score=round(hypo_overall, 2),
                score_delta=round(hypo_overall - current_overall, 2),
                explanation=result.get("explanation", fallback["explanation"]),
                key_factors=result.get("key_factors", fallback["key_factors"]),
                plausibility=result.get("plausibility", 0.5),
            )

            logger.info(f"[InteractiveExplainer.what_if_analysis] DONE | delta={response.score_delta}")
            return response

        except Exception as e:
            logger.error(f"[InteractiveExplainer.what_if_analysis] AI FAILURE | error={str(e)}")
            return WhatIfResult(
                original_score=round(current_overall, 2),
                hypothetical_score=round(current_overall, 2),
                score_delta=0,
                explanation=fallback["explanation"],
                key_factors=fallback["key_factors"],
                plausibility=fallback["plausibility"],
            )

    @staticmethod
    async def generate_counterfactual(
        reference_candidate_id: str,
        comparison_transcript: str,
        target_dimension: str,
        current_score: float
    ) -> CounterfactualExample:
        """
        Generate a counterfactual example showing what could improve the score.
        """
        logger.info(f"[InteractiveExplainer.generate_counterfactual] START | dim={target_dimension}")

        system_prompt = f"""You are helping a committee understand how to improve a candidate's score.
Current score in {target_dimension}: {current_score}/100

Create a hypothetical example of what this candidate could have said or done to score higher.
Be specific and realistic - use concrete examples that would fit in an interview context.

Return JSON:
{{
  "key_differences": [str],
  "lesson": str
}}"""

        user_prompt = f"Transcript snippet:\n{comparison_transcript[:1000]}"

        fallback = {
            "key_differences": ["More specific examples", "Clearer demonstration of skills"],
            "lesson": "Specific, concrete evidence strengthens assessment.",
        }

        try:
            result, _ = await llm.complete_with_fallback(
                system_prompt, user_prompt, fallback, temperature=0.4, max_tokens=400
            )

            response = CounterfactualExample(
                reference_candidate_id=reference_candidate_id,
                comparison_candidate_id="hypothetical_improved_version",
                dimension=target_dimension,
                key_differences=result.get("key_differences", fallback["key_differences"]),
                lesson=result.get("lesson", fallback["lesson"]),
            )

            logger.info(f"[InteractiveExplainer.generate_counterfactual] DONE")
            return response

        except Exception as e:
            logger.error(f"[InteractiveExplainer.generate_counterfactual] AI FAILURE | error={str(e)}")
            return CounterfactualExample(
                reference_candidate_id=reference_candidate_id,
                comparison_candidate_id="hypothetical_improved_version",
                dimension=target_dimension,
                key_differences=fallback["key_differences"],
                lesson=fallback["lesson"],
            )
