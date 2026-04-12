from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.bot.main import feed_webhook_update, start_bot_runtime, stop_bot_runtime
from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.bootstrap import seed_database

FRONTEND_SHELL_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
    app.state.bot_runtime = await start_bot_runtime()
    yield
    await stop_bot_runtime(app.state.bot_runtime)


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

frontend_dist = Path(settings.frontend_dist_dir)
frontend_index = frontend_dist / "index.html"
frontend_assets = frontend_dist / "assets"

if frontend_assets.exists():
    app.mount("/miniapp/assets", StaticFiles(directory=frontend_assets), name="miniapp-assets")
    app.mount("/assets", StaticFiles(directory=frontend_assets), name="assets")


def frontend_shell_response(path: Path) -> FileResponse:
    return FileResponse(path, headers=FRONTEND_SHELL_HEADERS)


@app.get("/", include_in_schema=False)
def root():
    if frontend_index.exists():
        return RedirectResponse(url="/miniapp", headers=FRONTEND_SHELL_HEADERS)
    return {"app": settings.app_name, "docs": "/docs", "health": "/api/v1/health"}


@app.get("/miniapp", include_in_schema=False)
def miniapp_entry():
    if frontend_index.exists():
        return frontend_shell_response(frontend_index)
    raise HTTPException(status_code=404, detail="Frontend bundle not found")


@app.get("/miniapp/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    requested = frontend_dist / full_path
    if requested.exists() and requested.is_file() and requested != frontend_index:
        return FileResponse(requested)
    if frontend_index.exists():
        return frontend_shell_response(frontend_index)
    raise HTTPException(status_code=404, detail="Frontend bundle not found")


@app.post("/telegram/webhook", include_in_schema=False)
async def telegram_webhook(request: Request):
    payload = await request.json()
    await feed_webhook_update(app.state.bot_runtime, payload)
    return {"ok": True}
