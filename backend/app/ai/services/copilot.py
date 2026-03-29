import logging
from app.ai.base import llm
from app.ai.schemas.copilot import (
    FollowUpRequest,
    FollowUpResponse,
    ThinkingStyleRequest,
    ThinkingStyleResult,
)

logger = logging.getLogger(__name__)


class FollowUpGenerator:
    """
    Generates follow-up questions for interviews based on weak areas and current scores.
    """

    @staticmethod
    async def suggest_question(request: FollowUpRequest) -> FollowUpResponse:
        """
        Suggest the next interview question based on progress and weak areas.
        """
        logger.info(f"[FollowUpGenerator.suggest_question] START | session_id={request.session_id}")

        scores_str = str(request.current_scores) if request.current_scores else "No scores yet"
        weak_areas_str = ", ".join(request.weak_areas) if request.weak_areas else "None identified yet"

        system_prompt = f"""You are an AI interview copilot. Based on the interview so far, suggest the SINGLE most valuable next question.

Current weak areas: {weak_areas_str}
Role: {request.role}
Current dimensional scores: {scores_str}

Rules:
- Target the weakest scoring dimension first
- Do not repeat questions already asked
- Match question complexity to role seniority
- If scores are generally high, probe for depth with a challenge question

Return JSON:
{{
  "suggested_question": str,
  "target_dimension": str,
  "reasoning": str,
  "urgency": "critical|recommended|optional"
}}"""

        # Format previous Q&A
        previous_qa_str = "\n".join([
            f"Q: {qa.get('question', '')}\nA: {qa.get('answer', '')}"
            for qa in request.previous_qa
        ]) if request.previous_qa else "No previous questions"

        user_prompt = f"Previous conversation:\n{previous_qa_str}"

        fallback = {
            "suggested_question": "Can you tell me more about a challenging situation you've faced and how you handled it?",
            "target_dimension": "problem_solving",
            "reasoning": "Fallback question to probe general problem-solving ability",
            "urgency": "recommended",
        }

        try:
            result, used_fallback = await llm.complete_with_fallback(
                system_prompt, user_prompt, fallback, temperature=0.3, max_tokens=500
            )

            response = FollowUpResponse(
                session_id=request.session_id,
                suggested_question=result.get("suggested_question", fallback["suggested_question"]),
                target_dimension=result.get("target_dimension", fallback["target_dimension"]),
                reasoning=result.get("reasoning", fallback["reasoning"]),
                urgency=result.get("urgency", fallback["urgency"]),
            )

            logger.info(f"[FollowUpGenerator.suggest_question] DONE | target={response.target_dimension} urgency={response.urgency}")
            return response

        except Exception as e:
            logger.error(f"[FollowUpGenerator.suggest_question] AI FAILURE | error={str(e)} | returning fallback")
            return FollowUpResponse(
                session_id=request.session_id,
                suggested_question=fallback["suggested_question"],
                target_dimension=fallback["target_dimension"],
                reasoning=fallback["reasoning"],
                urgency=fallback["urgency"],
            )


class ThinkingStyleAnalyzer:
    """
    Analyzes text to determine thinking style (human vs AI patterns).
    """

    @staticmethod
    async def analyze(request: ThinkingStyleRequest) -> ThinkingStyleResult:
        """
        Analyze thinking style in the provided text.
        """
        logger.info(f"[ThinkingStyleAnalyzer.analyze] START | text_length={len(request.text)}")

        system_prompt = """Classify the thinking style in this text.
Options:
- human_analytical: structured logic, data references, cause-effect chains
- human_intuitive: gut feelings, experience-based, less structured
- human_narrative: story-driven, personal examples, emotional
- ai_patterned: template-like, over-structured, no personal voice, generic
- mixed: combination

Return JSON:
{
  "thinking_style": str,
  "human_markers": [str],
  "ai_markers": [str],
  "confidence": float
}"""

        user_prompt = f"Text to analyze:\n{request.text}"

        fallback = {
            "thinking_style": "mixed",
            "human_markers": [],
            "ai_markers": [],
            "confidence": 0.5,
        }

        try:
            result, used_fallback = await llm.complete_with_fallback(
                system_prompt, user_prompt, fallback, temperature=0.2, max_tokens=500
            )

            response = ThinkingStyleResult(
                thinking_style=result.get("thinking_style", fallback["thinking_style"]),
                human_markers=result.get("human_markers", fallback["human_markers"]),
                ai_markers=result.get("ai_markers", fallback["ai_markers"]),
                confidence=result.get("confidence", fallback["confidence"]),
            )

            logger.info(f"[ThinkingStyleAnalyzer.analyze] DONE | style={response.thinking_style} confidence={response.confidence}")
            return response

        except Exception as e:
            logger.error(f"[ThinkingStyleAnalyzer.analyze] AI FAILURE | error={str(e)} | returning fallback")
            return ThinkingStyleResult(
                thinking_style=fallback["thinking_style"],
                human_markers=fallback["human_markers"],
                ai_markers=fallback["ai_markers"],
                confidence=fallback["confidence"],
            )
