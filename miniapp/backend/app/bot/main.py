import asyncio
import contextlib
import logging
from dataclasses import dataclass
from urllib.parse import urlsplit

from aiogram import Bot, Dispatcher
from aiogram.filters import Command, CommandStart
from aiogram.types import BotCommand, InlineKeyboardButton, MenuButtonCommands, Message, Update, WebAppInfo
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
        kb.row(InlineKeyboardButton(text="Открыть VERUM", url=fullscreen_link))
    else:
        kb.button(text="Открыть VERUM", web_app=WebAppInfo(url=settings.telegram_webapp_url))
    return kb


async def start_handler(message: Message) -> None:
    me = await message.bot.get_me()
    await message.answer(
        "VERUM единая судейская система",
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
    return "".join(character for character in value.strip().upper() if character.isalnum())


def _looks_like_admin_code_attempt(value: str) -> bool:
    normalized = _normalized_admin_code(value)
    expected = _normalized_admin_code(settings.admin_access_code or "")
    if expected and normalized == expected:
        return True
    return "ADMIN" in normalized or "VERUM" in normalized


def _is_admin_user(message: Message) -> bool:
    if not message.from_user:
        return False

    with SessionLocal() as db:
        user = db.query(User).filter(User.telegram_user_id == str(message.from_user.id)).first()
        return bool(user and user.role == "admin")


def _grant_admin_access(message: Message, code_text: str | None = None) -> bool:
    if not settings.admin_access_code:
        return False
    if not message.text or not message.from_user:
        return False
    candidate = code_text if code_text is not None else message.text
    if _normalized_admin_code(candidate) != _normalized_admin_code(settings.admin_access_code):
        logger.info("Rejected admin code attempt from telegram_user_id=%s", message.from_user.id)
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

    logger.info("Granted admin access to telegram_user_id=%s username=%s", telegram_user_id, telegram_username)
    return True


def _admin_success_text() -> str:
    return (
        "Код принят. Для этого Telegram-аккаунта открыт админ-доступ.\n\n"
        "Теперь полностью закрой Mini App и открой заново через кнопку ниже. "
        "Во вкладке снизу вместо «Профиль» появится «Админ»."
    )


async def admin_status_handler(message: Message) -> None:
    me = await message.bot.get_me()
    command_parts = (message.text or "").split(maxsplit=1)
    if len(command_parts) > 1:
        code_text = command_parts[1]
        if _grant_admin_access(message, code_text):
            await message.answer(
                _admin_success_text(),
                reply_markup=build_open_app_markup(me.username).as_markup(),
            )
            return

        await message.answer("Код не подошёл. Отправь так: /admin VERUM2026ADMIN")
        return

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

    if not settings.admin_access_code:
        if _looks_like_admin_code_attempt(message.text):
            await message.answer("Админ-код на сервере пока не настроен. Проверь переменную ADMIN_ACCESS_CODE в Railway.")
        return

    if not _grant_admin_access(message):
        if _looks_like_admin_code_attempt(message.text):
            await message.answer("Код не подошёл. Проверь раскладку клавиатуры и отправь код ещё раз одним сообщением.")
        return

    me = await message.bot.get_me()
    await message.answer(
        _admin_success_text(),
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


async def configure_bot_shell(bot: Bot) -> None:
    try:
        await bot.set_my_commands(
            [
                BotCommand(command="start", description="Открыть VERUM"),
                BotCommand(command="app", description="Показать кнопку запуска"),
                BotCommand(command="help", description="Помощь"),
                BotCommand(command="admin", description="Проверить админ-доступ"),
            ]
        )
        await bot.set_chat_menu_button(menu_button=MenuButtonCommands())
    except Exception:
        logger.exception("Failed to configure Telegram commands/menu button")


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
        await configure_bot_shell(bot)
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
    await configure_bot_shell(bot)

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
