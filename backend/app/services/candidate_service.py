from __future__ import annotations

from app.models import AnalyticsSummary
from app.services.repository import get_store


def _candidate_payload(state, candidate):
    session = next((item for item in state.interview_sessions if item.candidate_id == candidate.id), None)
    votes = state.committee_votes.get(candidate.id, [])
    approved = len([item for item in votes if item.decision == "approve"])
    rejected = len([item for item in votes if item.decision == "reject"])

    status = candidate.status
    if approved >= 3:
        status = "shortlisted"
    elif rejected >= 3:
        status = "rejected"
    elif votes:
        status = "flagged"
    elif session and session.status == "completed":
        status = "completed"

    return {
        "candidate": candidate.model_copy(update={"status": status}),
        "session": session,
        "votes": votes,
        "approved_votes": approved,
        "rejected_votes": rejected,
        "final_score": session.score_update.final_score if session and session.score_update else 0,
    }


def list_candidates():
    state = get_store().load()
    return [_candidate_payload(state, candidate) for candidate in state.candidates]


def get_candidate(candidate_id: str):
    state = get_store().load()
    candidate = next((item for item in state.candidates if item.id == candidate_id), None)
    if not candidate:
        return None
    return _candidate_payload(state, candidate)


def shortlist():
    candidates = list_candidates()
    return [item for item in candidates if item["candidate"].status == "shortlisted"]


def analytics_summary() -> AnalyticsSummary:
    candidates = list_candidates()
    total = len(candidates)
    scores = [item["final_score"] for item in candidates if item["final_score"] > 0]
    return AnalyticsSummary(
        total_candidates=total,
        shortlisted=len([item for item in candidates if item["candidate"].status == "shortlisted"]),
        flagged=len([item for item in candidates if item["candidate"].status == "flagged"]),
        average_score=round(sum(scores) / max(len(scores), 1), 1),
        pending_committee_review=len(
            [item for item in candidates if item["candidate"].status in {"in_progress", "completed", "flagged"}]
        ),
    )
