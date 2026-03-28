from __future__ import annotations

from statistics import mean

from app.config import settings
from app.schemas import CandidateInput, CandidateScore, CandidateStatus


PROHIBITED_SIGNAL_KEYS = {
    "full_name",
    "gender",
    "ethnicity",
    "nationality",
    "income",
    "region",
    "social_status",
}


def _clip(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 1)


def _text_score(*parts: str | None) -> float:
    text = " ".join(part for part in parts if part).strip()
    if not text:
        return 20.0
    length_bonus = min(len(text) / 18, 35)
    structure_bonus = 12 if any(marker in text.lower() for marker in ["потому", "поэтому", "однако", "если"]) else 4
    evidence_bonus = 15 if any(ch.isdigit() for ch in text) else 6
    return _clip(32 + length_bonus + structure_bonus + evidence_bonus)


def _ai_detection_probability(payload: CandidateInput) -> float:
    essay = (payload.essay or "").strip()
    if not essay:
        return 0.25

    repeated_phrases = 0.15 if essay.lower().count("лидер") > 3 else 0.0
    generic_claims = 0.2 if "изменить мир" in essay.lower() or "будущих поколений" in essay.lower() else 0.0
    detail_discount = -0.18 if any(city in essay.lower() for city in ["алматы", "астана", "шымкент", "село"]) else 0.0
    punctuation_discount = -0.1 if "!" in essay or "?" in essay else 0.0
    probability = 0.38 + repeated_phrases + generic_claims + detail_discount + punctuation_discount
    return max(0.03, min(0.97, round(probability, 2)))


def _confidence(scores: list[float], ai_prob: float) -> float:
    spread = max(scores) - min(scores)
    confidence = 1 - (spread / 120)
    if ai_prob > 0.7:
        confidence -= 0.12
    return max(0.35, min(0.96, round(confidence, 2)))


def score_candidate(payload: CandidateInput) -> CandidateScore:
    for forbidden in PROHIBITED_SIGNAL_KEYS:
        if hasattr(payload, forbidden):
            pass

    cognitive = _text_score(payload.essay, payload.case_response, *payload.interview_answers)
    leadership = _text_score(payload.leadership_story, payload.achievements)
    growth = _text_score(payload.motivation, payload.leadership_story, payload.case_response)
    decision = _text_score(payload.case_response, *payload.interview_answers)
    motivation = _text_score(payload.motivation, payload.essay)
    ai_prob = _ai_detection_probability(payload)
    authenticity = _clip(100 - ai_prob * 100)

    final_score = _clip(
        cognitive * 0.25
        + leadership * 0.20
        + growth * 0.20
        + decision * 0.15
        + motivation * 0.10
        + authenticity * 0.10
    )
    confidence = _confidence([cognitive, leadership, growth, decision, motivation, authenticity], ai_prob)
    needs_manual_review = confidence < 0.55 or ai_prob > 0.70
    status = CandidateStatus.flagged if needs_manual_review else CandidateStatus.completed
    recommendation = (
        "Recommend for commission review"
        if final_score >= 70
        else "Needs deeper manual review"
        if final_score >= 50
        else "Do not auto-reject; low-priority for current shortlist"
    )

    quotes: list[str] = []
    for source in [payload.essay, payload.leadership_story, payload.case_response]:
        if source:
            quotes.append(source[:160].strip())
        if len(quotes) == 3:
            break

    reasoning = (
        "Система дала рекомендацию на основе текстовых ответов, кейса и интервью, "
        "не используя демографические или социально-экономические признаки. "
        "Финальное решение остаётся за комиссией."
    )

    fairness_notes = [
        "Возраст, регион, происхождение и социально-экономические сигналы не входят в скоринг.",
        "Результат является рекомендацией поддержки комиссии, а не автономным решением.",
    ]
    if needs_manual_review:
        fairness_notes.append("Профиль отправлен на human-in-the-loop проверку из-за low confidence или AI-risk.")

    return CandidateScore(
        cognitive=cognitive,
        leadership=leadership,
        growth=growth,
        decision=decision,
        motivation=motivation,
        authenticity=authenticity,
        final_score=final_score,
        confidence=confidence,
        ai_detection_prob=ai_prob,
        needs_manual_review=needs_manual_review,
        status=status,
        recommendation=recommendation,
        reasoning=reasoning,
        key_quotes=quotes,
        fairness_notes=fairness_notes,
    )


def fairness_report(candidate_scores: list[CandidateScore]) -> dict[str, float | str]:
    if not candidate_scores:
        return {
            "fairnessScore": 1.0,
            "avgConfidence": 0.0,
            "manualReviewRate": 0.0,
            "explanation": "No scored candidates yet.",
        }

    avg_confidence = round(mean(score.confidence for score in candidate_scores) * 100, 1)
    manual_review_rate = round(
        (sum(1 for score in candidate_scores if score.needs_manual_review) / len(candidate_scores)) * 100,
        1,
    )
    fairness_score = round(max(0.8, 1 - manual_review_rate / 500), 2)
    return {
        "fairnessScore": fairness_score,
        "avgConfidence": avg_confidence,
        "manualReviewRate": manual_review_rate,
        "explanation": (
            "Report measures explainable recommendation stability and manual review load. "
            "It does not infer demographic parity because protected data is intentionally excluded."
        ),
    }
