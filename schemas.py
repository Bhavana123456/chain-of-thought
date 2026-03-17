"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    model: str = "llama3.2"
    messages: List[ChatMessage]
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    stream: bool = False
    options: Dict[str, Any] = {}


class ChatResponse(BaseModel):
    id: str
    session_id: str
    trace_id: Optional[str]
    model: str
    message: ChatMessage
    response: str                  # convenience alias = message.content
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float
    risk_score: float
    risk_flags: List[str]
    status: str
    compliance_status: str
    checksum: Optional[str]


# ── Audit Log ─────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: str
    session_id: str
    trace_id: Optional[str]
    model: str
    prompt: str
    response: Optional[str]
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float
    risk_score: float
    risk_flags: List[str]
    status: str
    compliance_status: str
    checksum: Optional[str]
    thought_chain: Optional[List]
    rag_context: Optional[List]
    user_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AuditLogOut]


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
    low: int
    medium: int
    high: int


class ModelStat(BaseModel):
    name: str
    display_name: str
    total_calls: int
    avg_latency_ms: float
    is_active: bool
    last_used: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Ollama Models ─────────────────────────────────────────────────────────────

class OllamaModel(BaseModel):
    name: str
    size_gb: float
    modified_at: Optional[str] = None
