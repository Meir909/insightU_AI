from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


def _attachment_kind(content_type: str | None) -> str:
    mime_type = content_type or ""
    if mime_type.startswith("audio/"):
        return "audio"
    if mime_type.startswith("video/"):
        return "video"
    if mime_type.startswith("text/"):
        return "text"
    return "document"


def save_upload(file: UploadFile) -> dict[str, str | int | list[str] | None]:
    uploads_dir = Path(__file__).resolve().parents[2] / ".data" / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    safe_name = file.filename.replace(" ", "_") if file.filename else "artifact.bin"
    artifact_id = f"att-{uuid4().hex[:10]}"
    name = f"{artifact_id}-{safe_name}"
    target = uploads_dir / name
    content = file.file.read()
    target.write_bytes(content)
    mime_type = file.content_type or "application/octet-stream"

    return {
        "id": artifact_id,
        "kind": _attachment_kind(mime_type),
        "name": file.filename or safe_name,
        "mime_type": mime_type,
        "size_kb": max(1, round(len(content) / 1024)),
        "status": "ready",
        "transcript": None,
        "extracted_signals": [],
        "storage_path": str(target),
    }
