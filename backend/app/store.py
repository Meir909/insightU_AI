from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from app.models import Account, AuthSession, CandidateProfile, CommitteeMember, CommitteeVote, InterviewSession


class StoreState(BaseModel):
    accounts: list[Account] = []
    auth_sessions: list[AuthSession] = []
    candidates: list[CandidateProfile] = []
    interview_sessions: list[InterviewSession] = []
    committee_members: list[CommitteeMember] = []
    committee_votes: dict[str, list[CommitteeVote]] = {}


class LocalStore:
    def __init__(self, root: Path) -> None:
        self._root = root
        self._path = root / "backend-store.json"
        self._root.mkdir(parents=True, exist_ok=True)

    def load(self) -> StoreState:
        if not self._path.exists():
            state = StoreState()
            self.save(state)
            return state

        raw = json.loads(self._path.read_text(encoding="utf-8"))
        return StoreState.model_validate(raw)

    def save(self, state: StoreState) -> None:
        self._path.write_text(json.dumps(state.model_dump(mode="json"), ensure_ascii=False, indent=2), encoding="utf-8")

    def update(self, mutator: Any):
        state = self.load()
        result = mutator(state)
        self.save(state)
        return result
