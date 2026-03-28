from telegram import Bot

from config import settings


async def send_typing(chat_id: int) -> None:
    if not settings.bot_token:
        return
    bot = Bot(token=settings.bot_token)
    await bot.send_chat_action(chat_id=chat_id, action="typing")
