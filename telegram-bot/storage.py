from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from config import settings


@dataclass
class BotSession:
    telegram_id: int
    language: str = "ru"
    step_index: int = 0
    terms_accepted: bool = False
    privacy_accepted: bool = False
    data: dict = field(default_factory=dict)
    media: dict = field(default_factory=lambda: {"file_urls": [], "video_urls": [], "voice_urls": []})
    followups: list[str] = field(default_factory=list)
    followup_answers: list[str] = field(default_factory=list)
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def touch(self) -> None:
        self.updated_at = datetime.now(timezone.utc).isoformat()

    def expired(self) -> bool:
        updated = datetime.fromisoformat(self.updated_at)
        return datetime.now(timezone.utc) - updated > timedelta(hours=settings.session_timeout_hours)


class SessionStorage:
    def __init__(self) -> None:
        self.path = Path(settings.bot_storage_path)
        self.sessions: dict[str, BotSession] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        raw = json.loads(self.path.read_text(encoding="utf-8"))
        for key, value in raw.items():
            self.sessions[key] = BotSession(**value)

    def _save(self) -> None:
        self.path.write_text(
            json.dumps({key: asdict(value) for key, value in self.sessions.items()}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def get(self, telegram_id: int) -> BotSession:
        key = str(telegram_id)
        session = self.sessions.get(key)
        if session is None or session.expired():
            session = BotSession(telegram_id=telegram_id)
            self.sessions[key] = session
            self._save()
        return session

    def put(self, session: BotSession) -> None:
        session.touch()
        self.sessions[str(session.telegram_id)] = session
        self._save()


session_storage = SessionStorage()
