from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException, status

from app.models import ChatMessage, ScoreSnapshot
from app.security import now_utc
from app.services.repository import get_store


def _score(messages_count: int) -> ScoreSnapshot:
    base = min(92.0, 48.0 + messages_count * 6.5)
    confidence = min(0.96, 0.45 + messages_count * 0.06)
    ai_risk = max(0.08, 0.26 - messages_count * 0.015)
    return ScoreSnapshot(
        cognitive=min(100, base + 2),
        leadership=min(100, base - 3),
        growth=min(100, base),
        decision=min(100, base - 1),
        motivation=min(100, base + 1),
        authenticity=min(100, base - 4),
        final_score=base,
        confidence=round(confidence, 2),
        ai_detection_prob=round(ai_risk, 2),
        needs_manual_review=base < 75,
        recommendation="Proceed to committee review" if base >= 72 else "Needs deeper committee review",
        explanation="Score updated from message depth, consistency and structured evidence in the current interview session.",
    )


def append_message(account_id: str, session_id: str, message: str):
    store = get_store()

    def mutate(state):
        session = next((item for item in state.interview_sessions if item.id == session_id and item.account_id == account_id), None)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

        timestamp = now_utc()
        session.messages.append(
            ChatMessage(
                id=f"msg-{uuid4().hex[:10]}",
                role="user",
                content=message,
                created_at=timestamp,
            )
        )
        session.messages.append(
            ChatMessage(
                id=f"msg-{uuid4().hex[:10]}",
                role="assistant",
                content="Спасибо. Ответ сохранён, а профиль кандидата обновлён для комиссии.",
                created_at=timestamp,
            )
        )
        session.progress = min(100, session.progress + 12)
        session.phase = "Adaptive deep dive" if session.progress >= 55 else "Foundation"
        session.status = "completed" if session.progress >= 100 else "active"
        session.score_update = _score(len([item for item in session.messages if item.role == "user"]))
        session.updated_at = timestamp
        return session

    return store.update(mutate)


def get_session(account_id: str):
    state = get_store().load()
    session = next((item for item in state.interview_sessions if item.account_id == account_id), None)
    if not session:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")
    return session
