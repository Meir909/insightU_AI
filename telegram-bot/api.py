from __future__ import annotations

import httpx

from config import settings


async def create_candidate(payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(f"{settings.backend_base_url}/api/v1/candidates", json=payload)
        response.raise_for_status()
        return response.json()


async def score_candidate(candidate_id: str) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(f"{settings.backend_base_url}/api/v1/candidates/{candidate_id}/score")
        response.raise_for_status()
        return response.json()


async def get_followups(language: str, summary: str) -> list[str]:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{settings.backend_base_url}/api/v1/interview/followups",
            json={"language": language, "summary": summary},
        )
        response.raise_for_status()
        return response.json().get("questions", [])
