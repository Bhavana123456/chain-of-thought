"""
ChainOfThought — Zero-Trust AI Audit Dashboard
FastAPI entry point.

Run:
    uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from database import init_db
from routers import chat, audit, dashboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Sync Ollama models into registry on startup
    from services.ollama_service import ollama
    from database import AsyncSessionLocal
    from models import ModelRegistry
    from sqlalchemy import select
    try:
        models = await ollama.list_models()
        async with AsyncSessionLocal() as session:
            for m in models:
                existing = (
                    await session.execute(
                        select(ModelRegistry).where(ModelRegistry.name == m["name"])
                    )
                ).scalar_one_or_none()
                if not existing:
                    session.add(
                        ModelRegistry(
                            name=m["name"],
                            display_name=m["name"].split(":")[0].title(),
                            size_gb=m["size_gb"],
                            is_active=True,
                        )
                    )
            await session.commit()
    except Exception as exc:
        print(f"[Startup] Could not sync Ollama models: {exc}")
    yield


app = FastAPI(
    title="ChainOfThought",
    description="Zero-Trust AI Audit Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ───────────────────────────────────────────────────────────────
app.include_router(chat.router)
app.include_router(audit.router)
app.include_router(dashboard.router)


# ── Serve React SPA (built output lands in static/dist/) ──────────────────────
import os

_DIST = os.path.join(os.path.dirname(__file__), "static", "dist")
_LEGACY = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_DIST, "index.html"))
else:
    # Fallback: old single-file static UI
    app.mount("/static", StaticFiles(directory=_LEGACY), name="static")

    @app.get("/", include_in_schema=False)
    async def serve_spa_legacy():
        return FileResponse(os.path.join(_LEGACY, "index.html"))


@app.get("/health")
async def health():
    return {"status": "ok", "app": "ChainOfThought"}
