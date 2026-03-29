from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


def save_upload(file: UploadFile) -> dict[str, str | int]:
    uploads_dir = Path(__file__).resolve().parents[2] / ".data" / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    safe_name = file.filename.replace(" ", "_") if file.filename else "artifact.bin"
    name = f"{uuid4().hex[:10]}-{safe_name}"
    target = uploads_dir / name
    content = file.file.read()
    target.write_bytes(content)

    return {
        "filename": file.filename or safe_name,
        "mime_type": file.content_type or "application/octet-stream",
        "storage_path": str(target),
        "size_bytes": len(content),
    }
