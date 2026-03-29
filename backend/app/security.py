from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_hex

from app.config import get_settings


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    salt = token_hex(16)
    digest = sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()
    return f"{salt}:{digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, digest = stored_hash.split(":", 1)
    except ValueError:
        return False
    return sha256(f"{salt}:{password}".encode("utf-8")).hexdigest() == digest


def generate_session_token() -> str:
    return token_hex(32)


def session_expiry() -> datetime:
    return now_utc() + timedelta(days=1)


def validate_committee_access_key(access_key: str) -> bool:
    return access_key == get_settings().committee_access_key
