from __future__ import annotations

from pathlib import Path

from app.store import LocalStore


def get_store() -> LocalStore:
    return LocalStore(Path(__file__).resolve().parents[2] / ".data")
