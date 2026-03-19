"""Dashboard stats and model registry router."""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models import AuditLog, ModelRegistry
from schemas import DashboardStats, RiskDistribution, ModelStat, OllamaModel
from services.ollama_service import ollama

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total = (await db.execute(select(func.count()).select_from(AuditLog))).scalar_one()

    traces_today = (
        await db.execute(
            select(func.count()).select_from(AuditLog).where(AuditLog.created_at >= today_start)
        )
    ).scalar_one()

    high_risk = (
        await db.execute(
            select(func.count()).select_from(AuditLog).where(AuditLog.risk_score >= 0.7)
        )
    ).scalar_one()

    blocked = (
        await db.execute(
            select(func.count()).select_from(AuditLog).where(AuditLog.status == "blocked")
        )
    ).scalar_one()

    errors = (
        await db.execute(
            select(func.count()).select_from(AuditLog).where(AuditLog.status == "error")
        )
    ).scalar_one()

    avg_latency = (
        await db.execute(select(func.avg(AuditLog.latency_ms)).select_from(AuditLog))
    ).scalar_one() or 0.0

    total_tokens_result = (
        await db.execute(
            select(
                func.sum(AuditLog.prompt_tokens + AuditLog.completion_tokens)
            ).select_from(AuditLog)
        )
    ).scalar_one() or 0

    active_models = (
        await db.execute(
            select(func.count()).select_from(ModelRegistry).where(ModelRegistry.is_active == True)
        )
    ).scalar_one()

    return DashboardStats(
        total_traces=total,
        active_models=active_models,
        high_risk_count=high_risk,
        avg_latency_ms=round(avg_latency, 1),
        total_tokens=total_tokens_result,
        error_rate=round(errors / total, 4) if total else 0.0,
        traces_today=traces_today,
        blocked_count=blocked,
    )


@router.get("/risk-distribution", response_model=RiskDistribution)
async def risk_distribution(db: AsyncSession = Depends(get_db)):
    low = (
        await db.execute(
            select(func.count()).select_from(AuditLog).where(AuditLog.risk_score < 0.3)
        )
    ).scalar_one()

    medium = (
        await db.execute(
            select(func.count())
            .select_from(AuditLog)
            .where(AuditLog.risk_score >= 0.3, AuditLog.risk_score < 0.7)
        )
    ).scalar_one()

    high = (
        await db.execute(
            select(func.count()).select_from(AuditLog).where(AuditLog.risk_score >= 0.7)
        )
    ).scalar_one()

    return RiskDistribution(low=low, medium=medium, high=high)


@router.get("/models", response_model=list[ModelStat])
async def get_model_stats(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(ModelRegistry).order_by(ModelRegistry.total_calls.desc()))).scalars().all()
    return [ModelStat.model_validate(r) for r in rows]


@router.get("/ollama/models", response_model=list[OllamaModel])
async def get_ollama_models(db: AsyncSession = Depends(get_db)):
    """Fetch live model list from Ollama and sync to ModelRegistry."""
    models = await ollama.list_models()

    for m in models:
        existing = (
            await db.execute(select(ModelRegistry).where(ModelRegistry.name == m["name"]))
        ).scalar_one_or_none()

        if not existing:
            db.add(
                ModelRegistry(
                    name=m["name"],
                    display_name=m["name"].split(":")[0].title(),
                    size_gb=m["size_gb"],
                    is_active=True,
                )
            )

    return [OllamaModel(**m) for m in models]


@router.get("/ollama/health")
async def ollama_health():
    from services.ollama_service import GROQ_API_KEY
    if GROQ_API_KEY:
        return {"status": "ok", "provider": "groq", "url": "https://api.groq.com"}
    healthy = await ollama.health()
    return {"status": "ok" if healthy else "unreachable", "provider": "ollama", "url": ollama.base_url}


@router.get("/recent-activity")
async def recent_activity(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """Last N audit entries for the live feed."""
    rows = (
        await db.execute(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()

    return [
        {
            "id": r.id,
            "model": r.model,
            "prompt_preview": r.prompt[:80] + ("…" if len(r.prompt) > 80 else ""),
            "risk_score": r.risk_score,
            "status": r.status,
            "latency_ms": r.latency_ms,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
