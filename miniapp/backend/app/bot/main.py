import asyncio
import contextlib

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
    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


async def start_bot_polling_task() -> tuple[Bot, asyncio.Task[None]] | None:
    if not settings.enable_bot_polling or not settings.telegram_bot_token:
        return None

    bot = Bot(token=settings.telegram_bot_token)
    dp = Dispatcher()
    dp.message.register(start_handler, CommandStart())
    task = asyncio.create_task(dp.start_polling(bot))
    return bot, task


async def stop_bot_polling_task(runtime: tuple[Bot, asyncio.Task[None]] | None) -> None:
    if not runtime:
        return

    bot, task = runtime
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    await bot.session.close()


if __name__ == "__main__":
    asyncio.run(run_bot())
