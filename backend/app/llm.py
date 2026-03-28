from __future__ import annotations

from openai import OpenAI

from app.config import settings


def generate_followup_questions(language: str, summary: str) -> list[str]:
    if not settings.openai_api_key:
        if language == "en":
            return [
                "Describe a moment when you changed your approach after failure.",
                "What difficult decision did you make in a team and why?",
                "How would you support a peer who has less confidence than you?",
            ]
        if language == "kk":
            return [
                "Сәтсіздіктен кейін көзқарасыңызды өзгерткен сәтті сипаттаңыз.",
                "Топта қандай қиын шешім қабылдадыңыз және неге?",
                "Өзіңізден сенімі төмен адамға қалай көмектесер едіңіз?",
            ]
        return [
            "Опишите момент, когда после неудачи вы изменили свой подход.",
            "Какое сложное решение вы приняли в команде и почему?",
            "Как бы вы поддержали менее уверенного участника команды?",
        ]

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = (
        "Generate exactly 3 concise follow-up interview questions for inVision U candidate screening. "
        "Focus on leadership potential, growth trajectory, and authentic motivation. "
        f"Language: {language}. Candidate summary: {summary}"
    )
    response = client.responses.create(model=settings.openai_model, input=prompt)
    text = response.output_text.strip()
    lines = [line.lstrip("-0123456789. ").strip() for line in text.splitlines() if line.strip()]
    return lines[:3]
