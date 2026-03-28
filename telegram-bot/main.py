from __future__ import annotations

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from api import create_candidate, get_followups, score_candidate
from config import settings
from notifier_ptb import send_typing
from storage import BotSession, session_storage
from translations import t


QUESTIONS = [
    "full_name",
    "age_range",
    "city",
    "school_name",
    "graduation_year",
    "motivation",
    "achievements",
    "leadership_story",
    "essay",
    "case",
]


def language_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Русский", callback_data="lang:ru"),
                InlineKeyboardButton(text="Қазақша", callback_data="lang:kk"),
                InlineKeyboardButton(text="English", callback_data="lang:en"),
            ]
        ]
    )


def consent_keyboard(language: str, session: BotSession) -> InlineKeyboardMarkup:
    terms_prefix = "✅ " if session.terms_accepted else ""
    privacy_prefix = "✅ " if session.privacy_accepted else ""
    rows = [
        [InlineKeyboardButton(text=f"{terms_prefix}{t(language, 'terms')}", callback_data="consent:terms")],
        [InlineKeyboardButton(text=f"{privacy_prefix}{t(language, 'privacy')}", callback_data="consent:privacy")],
    ]
    if session.terms_accepted and session.privacy_accepted:
        rows.append([InlineKeyboardButton(text=t(language, "next"), callback_data="consent:next")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def nav_keyboard(language: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t(language, "back"), callback_data="nav:back"),
                InlineKeyboardButton(text=t(language, "next"), callback_data="nav:next"),
            ]
        ]
    )


async def ask_current_question(message: Message, session: BotSession) -> None:
    language = session.language
    if session.step_index < len(QUESTIONS):
        key = QUESTIONS[session.step_index]
        await message.answer(t(language, key), reply_markup=nav_keyboard(language) if session.step_index > 0 else None)
        return

    if session.step_index == len(QUESTIONS):
        await message.answer(t(language, "upload_media"), reply_markup=nav_keyboard(language))
        return

    followup_index = session.step_index - len(QUESTIONS) - 1
    if followup_index < len(session.followups):
        if followup_index == 0:
            await message.answer(t(language, "followup_intro"))
        await message.answer(session.followups[followup_index], reply_markup=nav_keyboard(language))


async def move_forward(message: Message, session: BotSession) -> None:
    if session.step_index == len(QUESTIONS):
        if not session.followups:
            summary = " ".join(
                str(session.data.get(key, "")) for key in ["motivation", "achievements", "leadership_story", "essay"]
            )
            session.followups = await get_followups(session.language, summary)
        session.step_index += 1
    else:
        session.step_index += 1

    session_storage.put(session)

    if session.step_index > len(QUESTIONS) + len(session.followups):
        await submit_application(message, session)
        return

    await ask_current_question(message, session)


async def submit_application(message: Message, session: BotSession) -> None:
    payload = {
        "telegram_id": session.telegram_id,
        "language": session.language,
        "full_name": session.data.get("full_name"),
        "age_range": session.data.get("age_range"),
        "city": session.data.get("city"),
        "school_name": session.data.get("school_name"),
        "graduation_year": int(session.data.get("graduation_year") or 0) or None,
        "motivation": session.data.get("motivation"),
        "achievements": session.data.get("achievements"),
        "leadership_story": session.data.get("leadership_story"),
        "essay": session.data.get("essay"),
        "case_response": session.data.get("case"),
        "interview_answers": session.followup_answers,
        "file_urls": session.media["file_urls"],
        "video_urls": session.media["video_urls"],
        "voice_urls": session.media["voice_urls"],
        "consent": {
            "terms_accepted": session.terms_accepted,
            "privacy_accepted": session.privacy_accepted,
        },
    }
    created = await create_candidate(payload)
    scored = await score_candidate(created["id"])
    await message.answer(t(session.language, "submitted").format(code=created["code"]))
    await message.answer(t(session.language, "neutral_feedback"))
    session.step_index = 0
    session.data = {}
    session.followups = []
    session.followup_answers = []
    session.media = {"file_urls": [], "video_urls": [], "voice_urls": []}
    session_storage.put(session)


dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: Message) -> None:
    session = session_storage.get(message.from_user.id)
    await message.answer(t(session.language, "welcome"))
    await message.answer(t(session.language, "choose_language"), reply_markup=language_keyboard())


@dp.message(Command("help"))
async def help_command(message: Message) -> None:
    session = session_storage.get(message.from_user.id)
    await message.answer(
        "/start - start application\n/language - change language\n/restart - restart application",
    )
    await message.answer(t(session.language, "choose_language"), reply_markup=language_keyboard())


@dp.message(Command("language"))
async def language_command(message: Message) -> None:
    await message.answer("Language", reply_markup=language_keyboard())


@dp.message(Command("restart"))
async def restart_command(message: Message) -> None:
    session = BotSession(telegram_id=message.from_user.id)
    session_storage.put(session)
    await message.answer(t("ru", "welcome"))
    await message.answer(t("ru", "choose_language"), reply_markup=language_keyboard())


@dp.callback_query(F.data.startswith("lang:"))
async def choose_language(callback: CallbackQuery) -> None:
    language = callback.data.split(":")[1]
    session = session_storage.get(callback.from_user.id)
    session.language = language
    session_storage.put(session)
    await callback.message.answer(t(language, "consent"), reply_markup=consent_keyboard(language, session))
    await callback.answer()


@dp.callback_query(F.data.startswith("consent:"))
async def handle_consent(callback: CallbackQuery) -> None:
    action = callback.data.split(":")[1]
    session = session_storage.get(callback.from_user.id)
    if action == "terms":
        session.terms_accepted = True
    elif action == "privacy":
        session.privacy_accepted = True
    elif action == "next" and session.terms_accepted and session.privacy_accepted:
        session.step_index = 0
        session_storage.put(session)
        await callback.message.answer(t(session.language, "consent_ok"))
        await ask_current_question(callback.message, session)
        await callback.answer()
        return

    session_storage.put(session)
    await callback.message.edit_reply_markup(reply_markup=consent_keyboard(session.language, session))
    await callback.answer()


@dp.callback_query(F.data == "nav:back")
async def handle_back(callback: CallbackQuery) -> None:
    session = session_storage.get(callback.from_user.id)
    session.step_index = max(0, session.step_index - 1)
    session_storage.put(session)
    await ask_current_question(callback.message, session)
    await callback.answer()


@dp.callback_query(F.data == "nav:next")
async def handle_next(callback: CallbackQuery) -> None:
    session = session_storage.get(callback.from_user.id)
    await move_forward(callback.message, session)
    await callback.answer()


@dp.message(F.document | F.video | F.voice)
async def collect_media(message: Message) -> None:
    session = session_storage.get(message.from_user.id)
    if session.step_index != len(QUESTIONS):
        return
    if message.document:
        session.media["file_urls"].append(message.document.file_id)
    if message.video:
        session.media["video_urls"].append(message.video.file_id)
    if message.voice:
        session.media["voice_urls"].append(message.voice.file_id)
    session_storage.put(session)
    await message.answer(t(session.language, "upload_media"), reply_markup=nav_keyboard(session.language))


@dp.message()
async def collect_answers(message: Message) -> None:
    session = session_storage.get(message.from_user.id)
    if session.expired():
        session = BotSession(telegram_id=message.from_user.id, language=session.language)
        session_storage.put(session)
        await message.answer(t(session.language, "timeout"))
        await message.answer(t(session.language, "choose_language"), reply_markup=language_keyboard())
        return

    if not session.terms_accepted or not session.privacy_accepted:
        await message.answer(t(session.language, "consent"), reply_markup=consent_keyboard(session.language, session))
        return

    await send_typing(message.chat.id)

    if session.step_index < len(QUESTIONS):
        key = QUESTIONS[session.step_index]
        session.data[key] = message.text or ""
        session.step_index += 1
        if session.step_index == len(QUESTIONS):
            session_storage.put(session)
            await ask_current_question(message, session)
            return
    elif session.step_index > len(QUESTIONS):
        session.followup_answers.append(message.text or "")
        await move_forward(message, session)
        return

    session_storage.put(session)
    await ask_current_question(message, session)


async def main() -> None:
    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN is missing. Fill .env before starting the bot.")

    bot = Bot(token=settings.bot_token)
    await dp.start_polling(bot)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
