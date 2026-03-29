from __future__ import annotations

from fastapi import HTTPException, status

from app.models import CommitteeVote
from app.schemas import VoteRequest
from app.security import now_utc
from app.services.repository import get_store


def save_vote(account_id: str, candidate_id: str, member_id: str, member_name: str, payload: VoteRequest):
    store = get_store()

    def mutate(state):
        candidate = next((item for item in state.candidates if item.id == candidate_id), None)
        if not candidate:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

        votes = state.committee_votes.setdefault(candidate_id, [])
        vote = CommitteeVote(
            member_id=member_id,
            member_name=member_name,
            decision=payload.decision,
            rationale=payload.rationale,
            created_at=now_utc(),
        )
        filtered = [item for item in votes if item.member_id != member_id]
        filtered.append(vote)
        state.committee_votes[candidate_id] = filtered

        approved = len([item for item in filtered if item.decision == "approve"])
        rejected = len([item for item in filtered if item.decision == "reject"])
        if approved >= 3:
            candidate.status = "shortlisted"
        elif rejected >= 3:
            candidate.status = "rejected"
        elif filtered:
            candidate.status = "flagged"
        candidate.updated_at = now_utc()
        return vote

    return store.update(mutate)
