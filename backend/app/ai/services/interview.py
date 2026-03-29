import logging
from app.ai.base import llm
from app.ai.schemas.interview import (
    InterviewAnalysisRequest,
    InterviewAnalysisResponse,
    SingleAnswerAnalysis,
    AnswerDepth,
    ThinkingStyle,
)

logger = logging.getLogger(__name__)


class RealTimeInterviewAnalyzer:
    """
    Analyzes individual interview answers in real-time during active sessions.
    """

    @staticmethod
    async def analyze_answer(request: InterviewAnalysisRequest) -> InterviewAnalysisResponse:
        """
        Analyze a single answer during an active interview session.
        This should be FAST (< 3 seconds) — use gpt-4o-mini.
        """
        logger.info(f"[RealTimeInterviewAnalyzer.analyze_answer] START | session_id={request.session_id} candidate_id={request.candidate_id}")

        # Format previous Q&A
        previous_qa_formatted = "\n".join([
            f"Q: {qa.get('question', '')}\nA: {qa.get('answer', '')}"
            for qa in request.previous_qa
        ]) if request.previous_qa else "None"

        system_prompt = f"""You are analyzing a single interview answer in real-time.
Role: {request.role}

Evaluate:
1. DEPTH: shallow (surface answer) / medium (some substance) / deep (insight + evidence + reflection)
2. THINKING STYLE: human_analytical | human_intuitive | human_narrative | ai_patterned | mixed
3. BEHAVIORAL signals: confidence, hesitation, evasiveness (0-1 each)
4. DIMENSIONAL IMPACT: how does this answer change scores for each of 5 dimensions? Return delta (-10 to +10)
5. WEAK AREAS: dimensions this answer failed to demonstrate
6. STRONG AREAS: dimensions this answer demonstrated well

Previous conversation:
{previous_qa_formatted}

Return JSON:
{{
  "depth": "shallow|medium|deep",
  "depth_score": float,
  "thinking_style": str,
  "behavioral_signals": {{"confidence": float, "hesitation": float, "evasiveness": float}},
  "dimensional_deltas": {{"hard_skills": float, "soft_skills": float, "problem_solving": float, "communication": float, "adaptability": float}},
  "weak_areas": [str],
  "strong_areas": [str]
}}"""

        user_prompt = f"""Question: {request.question}

Answer: {request.answer}"""

        fallback = {
            "depth": "medium",
            "depth_score": 0.5,
            "thinking_style": "mixed",
            "behavioral_signals": {"confidence": 0.5, "hesitation": 0.5, "evasiveness": 0.5},
            "dimensional_deltas": {"hard_skills": 0, "soft_skills": 0, "problem_solving": 0, "communication": 0, "adaptability": 0},
            "weak_areas": ["insufficient_data"],
            "strong_areas": [],
        }

        try:
            result, used_fallback = await llm.complete_with_fallback(
                system_prompt,
                user_prompt,
                fallback,
                model="gpt-4o-mini",  # Use faster model for real-time
                temperature=0.2,
                max_tokens=800,
            )

            # Update current_scores by applying dimensional_deltas (clamped 0-100)
            updated_scores = request.current_scores.copy() if request.current_scores else {
                "hard_skills": 50, "soft_skills": 50, "problem_solving": 50,
                "communication": 50, "adaptability": 50
            }

            deltas = result.get("dimensional_deltas", {})
            for dim, delta in deltas.items():
                if dim in updated_scores:
                    updated_scores[dim] = max(0, min(100, updated_scores[dim] + delta))

            # Calculate session progress based on number of Q&A pairs
            total_qa = len(request.previous_qa) + 1
            progress = min(1.0, total_qa / 10)  # Assume 10 questions = full session

            analysis = SingleAnswerAnalysis(
                question=request.question,
                answer=request.answer,
                depth=AnswerDepth(result.get("depth", "medium")),
                depth_score=result.get("depth_score", 0.5),
                thinking_style=ThinkingStyle(result.get("thinking_style", "mixed")),
                behavioral_signals=result.get("behavioral_signals", fallback["behavioral_signals"]),
                dimensional_deltas=deltas,
                weak_areas=result.get("weak_areas", []),
                strong_areas=result.get("strong_areas", []),
            )

            response = InterviewAnalysisResponse(
                session_id=request.session_id,
                analysis=analysis,
                updated_scores=updated_scores,
                session_progress=progress,
            )

            logger.info(f"[RealTimeInterviewAnalyzer.analyze_answer] DONE | depth={analysis.depth} used_fallback={used_fallback}")
            return response

        except Exception as e:
            logger.error(f"[RealTimeInterviewAnalyzer.analyze_answer] AI FAILURE | error={str(e)} | returning fallback")
            return InterviewAnalysisResponse(
                session_id=request.session_id,
                analysis=SingleAnswerAnalysis(
                    question=request.question,
                    answer=request.answer,
                    depth=AnswerDepth.MEDIUM,
                    depth_score=0.5,
                    thinking_style=ThinkingStyle.MIXED,
                    behavioral_signals={"confidence": 0.5, "hesitation": 0.5, "evasiveness": 0.5},
                    dimensional_deltas={"hard_skills": 0, "soft_skills": 0, "problem_solving": 0, "communication": 0, "adaptability": 0},
                    weak_areas=["analysis_error"],
                    strong_areas=[],
                ),
                updated_scores=request.current_scores or {
                    "hard_skills": 50, "soft_skills": 50, "problem_solving": 50,
                    "communication": 50, "adaptability": 50
                },
                session_progress=0.5,
            )
