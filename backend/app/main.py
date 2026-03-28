from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.llm import generate_followup_questions
from app.schemas import CandidateInput
from app.scoring import fairness_report, score_candidate
from app.storage import storage

app = FastAPI(
    title="InsightU Backend",
    version="0.1.0",
    description="Explainable support backend for inVision U candidate screening.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.post("/api/v1/candidates")
def create_candidate(payload: CandidateInput) -> dict:
    if not payload.consent.terms_accepted or not payload.consent.privacy_accepted:
        raise HTTPException(status_code=400, detail="Consent is required before processing the application.")

    record = storage.create_candidate(payload)
    return record.model_dump(mode="json")


@app.post("/api/v1/candidates/{candidate_id}/score")
def run_scoring(candidate_id: str) -> dict:
    record = storage.get_candidate(candidate_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    record.score = score_candidate(record.raw)
    record.status = record.score.status
    storage.save_candidate(record)
    return record.model_dump(mode="json")


@app.get("/api/v1/candidates/{candidate_id}")
def get_candidate(candidate_id: str) -> dict:
    record = storage.get_candidate(candidate_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return {
        "id": record.id,
        "code": record.code,
        "status": record.status,
        "city": record.city,
        "language": record.language,
        "telegram_id": record.telegram_id,
        "consent": record.consent.model_dump(mode="json"),
        "raw": record.raw.model_dump(mode="json"),
        **(record.score.model_dump(mode="json") if record.score else {}),
    }


@app.get("/api/v1/ranking")
def ranking() -> dict:
    records = storage.list_candidates()
    ranked = []
    for record in records:
        score = record.score or score_candidate(record.raw)
        ranked.append(
            {
                "id": record.id,
                "code": record.code,
                "status": score.status,
                "city": record.city,
                "program": "inVision U",
                "language": record.language,
                "final_score": score.final_score,
                "cognitive": score.cognitive,
                "leadership": score.leadership,
                "growth": score.growth,
                "decision": score.decision,
                "motivation": score.motivation,
                "authenticity": score.authenticity,
                "confidence": score.confidence,
                "ai_detection_prob": score.ai_detection_prob,
                "needs_manual_review": score.needs_manual_review,
                "reasoning": score.reasoning,
                "key_quotes": score.key_quotes,
                "goals": record.raw.motivation,
                "experience": record.raw.achievements,
                "motivation_text": record.raw.motivation,
                "essay_excerpt": (record.raw.essay or "")[:220],
                "ai_signals": score.fairness_notes,
                "name": record.raw.full_name or f"Candidate {record.code}",
            }
        )
    ranked.sort(key=lambda item: item["final_score"], reverse=True)
    return {"candidates": ranked}


@app.get("/api/v1/shortlist")
def shortlist() -> list[dict]:
    ranked = ranking()["candidates"]
    return [item for item in ranked if item["final_score"] >= 70][:20]


@app.get("/api/v1/fairness/report")
def get_fairness_report() -> dict:
    records = storage.list_candidates()
    scores = [record.score or score_candidate(record.raw) for record in records]
    return fairness_report(scores)


@app.post("/api/v1/ai-detection")
def ai_detection(payload: CandidateInput) -> dict:
    score = score_candidate(payload)
    return {
        "ai_detection_prob": score.ai_detection_prob,
        "authenticity": score.authenticity,
        "needs_manual_review": score.needs_manual_review,
    }


@app.post("/api/v1/interview/followups")
def interview_followups(payload: dict) -> dict:
    language = str(payload.get("language", "ru"))
    summary = str(payload.get("summary", ""))
    return {"questions": generate_followup_questions(language, summary)}
