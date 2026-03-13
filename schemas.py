"""Pydantic request/response schemas."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    model: str = "llama3.2"
    messages: list[ChatMessage]
    session_id: str | None = None
    user_id: str | None = None
    stream: bool = False
    options: dict[str, Any] = {}


class ChatResponse(BaseModel):
    id: str
    session_id: str
    trace_id: str | None
    model: str
    message: ChatMessage
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float
    risk_score: float
    risk_flags: list[str]
    status: str


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: str
    session_id: str
    trace_id: str | None
    model: str
    prompt: str
    response: str | None
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float
    risk_score: float
    risk_flags: list[str]
    status: str
    user_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AuditLogOut]


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_traces: int
    active_models: int
    high_risk_count: int
    avg_latency_ms: float
    total_tokens: int
    error_rate: float
    traces_today: int
    blocked_count: int


class RiskDistribution(BaseModel):
    low: int      # 0.0 – 0.3
    medium: int   # 0.3 – 0.7
    high: int     # 0.7 – 1.0


class ModelStat(BaseModel):
    name: str
    display_name: str
    total_calls: int
    avg_latency_ms: float
    is_active: bool
    last_used: datetime | None

    model_config = {"from_attributes": True}


# ── Ollama Models ─────────────────────────────────────────────────────────────

class OllamaModel(BaseModel):
    name: str
    size_gb: float
    modified_at: str | None = None
