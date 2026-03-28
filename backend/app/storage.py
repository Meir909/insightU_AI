from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

from supabase import Client, create_client

from app.config import settings
from app.schemas import CandidateInput, CandidateRecord, CandidateStatus


class Storage:
    def __init__(self) -> None:
        self._lock = Lock()
        self._records: dict[str, CandidateRecord] = {}
        self._supabase: Client | None = None

        if settings.supabase_url and settings.supabase_service_role_key:
            self._supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

    @property
    def uses_supabase(self) -> bool:
        return self._supabase is not None

    def create_candidate(self, payload: CandidateInput) -> CandidateRecord:
        now = datetime.now(timezone.utc)
        candidate_id = f"cand-{uuid4().hex[:10]}"
        code = f"IU-{str(payload.telegram_id)[-4:]}-{candidate_id[-3:].upper()}"
        record = CandidateRecord(
            id=candidate_id,
            code=code,
            status=CandidateStatus.in_progress,
            city=payload.city,
            language=payload.language,
            created_at=now,
            updated_at=now,
            telegram_id=payload.telegram_id,
            consent=payload.consent,
            raw=payload,
            score=None,
        )

        with self._lock:
            self._records[record.id] = record

        if self._supabase is not None:
            self._supabase.table(settings.supabase_candidates_table).upsert(record.model_dump(mode="json")).execute()

        return record

    def save_candidate(self, record: CandidateRecord) -> CandidateRecord:
        record.updated_at = datetime.now(timezone.utc)

        with self._lock:
            self._records[record.id] = record

        if self._supabase is not None:
            self._supabase.table(settings.supabase_candidates_table).upsert(record.model_dump(mode="json")).execute()

        return record

    def get_candidate(self, candidate_id: str) -> CandidateRecord | None:
        with self._lock:
            local = self._records.get(candidate_id)
        if local is not None:
            return local

        if self._supabase is not None:
            result = (
                self._supabase.table(settings.supabase_candidates_table)
                .select("*")
                .eq("id", candidate_id)
                .limit(1)
                .execute()
            )
            if result.data:
                return CandidateRecord.model_validate(result.data[0])
        return None

    def list_candidates(self) -> list[CandidateRecord]:
        with self._lock:
            local = list(self._records.values())

        if local:
            return sorted(local, key=lambda item: item.updated_at, reverse=True)

        if self._supabase is not None:
            result = self._supabase.table(settings.supabase_candidates_table).select("*").execute()
            return [CandidateRecord.model_validate(item) for item in result.data]

        return []


storage = Storage()
