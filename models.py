"""SQLAlchemy ORM models for ChainOfThought."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict
from sqlalchemy import String, Text, Float, Integer, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuditLog(Base):
    """Every AI interaction is recorded here."""
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    trace_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_flags: Mapped[List] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), default="success")
    user_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    metadata_: Mapped[Dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ModelRegistry(Base):
    """Tracks available Ollama models and their health."""
    __tablename__ = "model_registry"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    size_gb: Mapped[float] = mapped_column(Float, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_calls: Mapped[int] = mapped_column(Integer, default=0)
    avg_latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
