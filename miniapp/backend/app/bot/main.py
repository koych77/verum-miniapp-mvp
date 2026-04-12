import asyncio
import contextlib
import logging
from dataclasses import dataclass
from urllib.parse import urlsplit

from aiogram import Bot, Dispatcher
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardButton, Message, Update, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.entities import AuditLog, User

logger = logging.getLogger(__name__)


@dataclass
class BotRuntime:
    bot: Bot
    dispatcher: Dispatcher
    mode: str
    task: asyncio.Task[None] | None = None


def build_fullscreen_miniapp_link(bot_username: str | None) -> str | None:
    resolved_username = (settings.telegram_bot_username or bot_username or "").lstrip("@")
    if not resolved_username:
        return None

    if settings.telegram_miniapp_short_name:
        short_name = settings.telegram_miniapp_short_name.strip("/")
        return f"https://t.me/{resolved_username}/{short_name}?mode=fullscreen"

    return f"https://t.me/{resolved_username}?startapp=main&mode=fullscreen"


def build_open_app_markup(bot_username: str | None) -> InlineKeyboardBuilder:
    kb = InlineKeyboardBuilder()
    fullscreen_link = build_fullscreen_miniapp_link(bot_username)
    if fullscreen_link:
        kb.row(InlineKeyboardButton(text="Открыть VERUM Mini App", url=fullscreen_link))
    else:
        kb.button(text="Открыть VERUM Mini App", web_app=WebAppInfo(url=settings.telegram_webapp_url))
    return kb


async def start_handler(message: Message) -> None:
    me = await message.bot.get_me()
    await message.answer(
        "Открой VERUM Mini App по кнопке ниже. Этот запуск ведёт в правильный fullscreen-сценарий Telegram.",
        reply_markup=build_open_app_markup(me.username).as_markup(),
    )


async def app_handler(message: Message) -> None:
    await start_handler(message)


async def help_handler(message: Message) -> None:
    me = await message.bot.get_me()
    await message.answer(
        "Команды бота:\n"
        "/start — показать кнопку запуска\n"
        "/app — снова показать кнопку запуска\n"
        "/admin — проверить, открыт ли админ-доступ\n\n"
        "Для стабильного fullscreen запускай приложение через кнопку из сообщения бота.",
        reply_markup=build_open_app_markup(me.username).as_markup(),
    )


def _normalized_admin_code(value: str) -> str:
    return "".join(value.strip().split()).upper()


def _is_admin_user(message: Message) -> bool:
    if not message.from_user:
        return False

    with SessionLocal() as db:
        user = db.query(User).filter(User.telegram_user_id == str(message.from_user.id)).first()
        return bool(user and user.role == "admin")


def _grant_admin_access(message: Message) -> bool:
    if not settings.admin_access_code:
        return False
    if not message.text or not message.from_user:
        return False
    if _normalized_admin_code(message.text) != _normalized_admin_code(settings.admin_access_code):
        return False

    telegram_user_id = str(message.from_user.id)
    telegram_username = message.from_user.username or f"user_{telegram_user_id}"

    with SessionLocal() as db:
        user = db.query(User).filter(User.telegram_user_id == telegram_user_id).first()
        if user:
            user.role = "admin"
            user.telegram_username = telegram_username
            user.email_verified = True
        else:
            user = User(
                role="admin",
                telegram_user_id=telegram_user_id,
                telegram_username=telegram_username,
                email=f"admin-{telegram_user_id}@verum.app",
                email_verified=True,
            )
            db.add(user)
            db.flush()

        db.add(
            AuditLog(
                actor_user_id=user.id,
                entity_type="auth",
                action="admin_access_granted",
                payload='{"source":"telegram_code"}',
            )
        )
        db.commit()

    return True


async def admin_status_handler(message: Message) -> None:
    me = await message.bot.get_me()
    if _is_admin_user(message):
        await message.answer(
            "Для этого Telegram-аккаунта уже открыт админ-доступ. Закрой Mini App и открой заново: вместо профиля появится вкладка администратора.",
            reply_markup=build_open_app_markup(me.username).as_markup(),
        )
        return

    await message.answer("Админ-доступ пока не активирован. Отправь в этот чат секретный код доступа.")


async def admin_code_handler(message: Message) -> None:
    if not message.text or message.text.startswith("/"):
        return
    if not _grant_admin_access(message):
        return

    me = await message.bot.get_me()
    await message.answer(
        "Код принят. Для этого Telegram-аккаунта открыт админ-доступ. Закрой Mini App и открой заново: вместо профиля появится админ-раздел.",
        reply_markup=build_open_app_markup(me.username).as_markup(),
    )


def build_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.message.register(start_handler, CommandStart())
    dp.message.register(app_handler, Command("app"))
    dp.message.register(help_handler, Command("help"))
    dp.message.register(admin_status_handler, Command("admin"))
    dp.message.register(admin_code_handler)
    return dp


def resolve_webhook_url() -> str | None:
    if not settings.telegram_webapp_url.startswith(("http://", "https://")):
        return None

    parts = urlsplit(settings.telegram_webapp_url)
    if not parts.scheme or not parts.netloc:
        return None

    return f"{parts.scheme}://{parts.netloc}/telegram/webhook"


async def run_bot() -> None:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is required")
    bot = Bot(token=settings.telegram_bot_token)
    dp = build_dispatcher()
    try:
        await bot.delete_webhook(drop_pending_updates=False)
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


async def start_bot_runtime() -> BotRuntime | None:
    if not settings.telegram_bot_token:
        logger.warning("Telegram bot token is missing, bot runtime will not start")
        return None

    bot = Bot(token=settings.telegram_bot_token)
    dispatcher = build_dispatcher()
    webhook_url = resolve_webhook_url()

    if webhook_url:
        try:
            logger.info("Setting Telegram webhook to %s", webhook_url)
            await bot.set_webhook(webhook_url, drop_pending_updates=False)
            return BotRuntime(bot=bot, dispatcher=dispatcher, mode="webhook")
        except Exception:
            logger.exception("Failed to configure Telegram webhook, falling back to polling")

    async def polling_runner() -> None:
        logger.info("Starting Telegram bot polling")
        await bot.delete_webhook(drop_pending_updates=False)
        await dispatcher.start_polling(bot)

    task = asyncio.create_task(polling_runner())

    def _log_task_result(done_task: asyncio.Task[None]) -> None:
        with contextlib.suppress(asyncio.CancelledError):
            error = done_task.exception()
            if error:
                logger.exception("Telegram bot polling stopped with error", exc_info=error)

    task.add_done_callback(_log_task_result)
    return BotRuntime(bot=bot, dispatcher=dispatcher, mode="polling", task=task)


async def feed_webhook_update(runtime: BotRuntime | None, update_data: dict) -> None:
    if not runtime or runtime.mode != "webhook":
        return

    update = Update.model_validate(update_data, context={"bot": runtime.bot})
    await runtime.dispatcher.feed_update(runtime.bot, update)


async def stop_bot_runtime(runtime: BotRuntime | None) -> None:
    if not runtime:
        return

    if runtime.task:
        runtime.task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await runtime.task

    await runtime.bot.session.close()


if __name__ == "__main__":
    asyncio.run(run_bot())
