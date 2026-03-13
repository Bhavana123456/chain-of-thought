"""
SQLite database setup with optional LiteSync support.
LiteSync adds real-time multi-writer sync to SQLite.
Set LITESYNC_LICENSE_KEY in .env to enable it.
"""

import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

LITESYNC_LICENSE = os.getenv("LITESYNC_LICENSE_KEY", "")
DB_PATH = os.getenv("DB_PATH", "./chainofthought.db")

# LiteSync wraps SQLite — if license key is present, enable it via the
# litesync connection URI scheme; otherwise fall back to plain aiosqlite.
if LITESYNC_LICENSE:
    # LiteSync exposes itself as a SQLite-compatible driver.
    # Install litesync Python package separately: pip install litesync
    try:
        import litesync  # noqa: F401
        DATABASE_URL = f"sqlite+litesync:///{DB_PATH}"
    except ImportError:
        print("[WARNING] litesync package not found — falling back to plain SQLite.")
        DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"
else:
    DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Create all tables on startup."""
    async with engine.begin() as conn:
        from models import AuditLog, ModelRegistry  # noqa: F401 — ensure models are registered
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
