from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.bot.main import start_bot_polling_task, stop_bot_polling_task
from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.bootstrap import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
    app.state.bot_runtime = await start_bot_polling_task()
    yield
    await stop_bot_polling_task(app.state.bot_runtime)


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


@app.get("/", include_in_schema=False)
def root():
    if frontend_index.exists():
        return FileResponse(frontend_index)
    return {"app": settings.app_name, "docs": "/docs", "health": "/api/v1/health"}


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    requested = frontend_dist / full_path
    if requested.exists() and requested.is_file():
        return FileResponse(requested)
    if frontend_index.exists():
        return FileResponse(frontend_index)
    raise HTTPException(status_code=404, detail="Frontend bundle not found")
