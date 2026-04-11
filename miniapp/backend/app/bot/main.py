import asyncio

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.core.config import settings


async def start_handler(message: Message) -> None:
    kb = InlineKeyboardBuilder()
    kb.button(text="Open VERUM Mini App", web_app=WebAppInfo(url=settings.telegram_webapp_url))
    await message.answer(
        "VERUM Mini App is ready. Open the app to view rankings, events, partners and your profile.",
        reply_markup=kb.as_markup(),
    )


async def run_bot() -> None:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is required")
    bot = Bot(token=settings.telegram_bot_token)
    dp = Dispatcher()
    dp.message.register(start_handler, CommandStart())
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(run_bot())
