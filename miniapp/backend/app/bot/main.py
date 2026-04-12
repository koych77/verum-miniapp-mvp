import asyncio
import contextlib

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, Message, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.core.config import settings


def build_fullscreen_miniapp_link(bot_username: str | None) -> str | None:
    resolved_username = (settings.telegram_bot_username or bot_username or "").lstrip("@")
    if not resolved_username:
        return None

    if settings.telegram_miniapp_short_name:
        short_name = settings.telegram_miniapp_short_name.strip("/")
        return f"https://t.me/{resolved_username}/{short_name}?mode=fullscreen"

    return f"https://t.me/{resolved_username}?startapp=main&mode=fullscreen"


async def start_handler(message: Message) -> None:
    kb = InlineKeyboardBuilder()
    me = await message.bot.get_me()
    fullscreen_link = build_fullscreen_miniapp_link(me.username)
    if fullscreen_link:
        kb.row(InlineKeyboardButton(text="Открыть VERUM Mini App", url=fullscreen_link))
    else:
        kb.button(text="Открыть VERUM Mini App", web_app=WebAppInfo(url=settings.telegram_webapp_url))
    await message.answer(
        "VERUM Mini App должен открываться в fullscreen-режиме. Если Telegram показывает встроенное окно, значит в BotFather ещё не настроен Main/Direct Mini App fullscreen launch.",
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
