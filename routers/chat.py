"""Chat router — sends messages to Ollama, records audit log, traces with Langfuse."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from database import get_db
from models import AuditLog, ModelRegistry
from schemas import ChatRequest, ChatResponse
from services.ollama_service import ollama
from services.langfuse_service import langfuse_svc
from services.risk_service import compute_risk

router = APIRouter(prefix="/api/chat", tags=["chat"])

BLOCK_THRESHOLD = float(0.9)  # block requests above this risk score


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    session_id = req.session_id or str(uuid.uuid4())
    messages = [m.model_dump() for m in req.messages]
    user_prompt = messages[-1]["content"] if messages else ""

    # ── Pre-flight risk check ─────────────────────────────────────────────────
    pre_risk, pre_flags = compute_risk(user_prompt)
    if pre_risk >= BLOCK_THRESHOLD:
        log = AuditLog(
            session_id=session_id,
            model=req.model,
            prompt=user_prompt,
            response=None,
            risk_score=pre_risk,
            risk_flags=pre_flags,
            status="blocked",
            user_id=req.user_id,
        )
        db.add(log)
        await db.flush()
        raise HTTPException(
            status_code=451,
            detail={
                "error": "Request blocked by Zero-Trust policy.",
                "risk_score": pre_risk,
                "flags": pre_flags,
                "audit_id": log.id,
            },
        )

    # ── Call Ollama ───────────────────────────────────────────────────────────
    try:
        response_text, prompt_tokens, completion_tokens, latency_ms = await ollama.chat(
            model=req.model,
            messages=messages,
            options=req.options,
        )
        status = "success"
    except Exception as exc:
        log = AuditLog(
            session_id=session_id,
            model=req.model,
            prompt=user_prompt,
            response=str(exc),
            risk_score=pre_risk,
            risk_flags=pre_flags,
            status="error",
            user_id=req.user_id,
        )
        db.add(log)
        raise HTTPException(status_code=502, detail=f"Ollama error: {exc}")

    # ── Post-response risk check ──────────────────────────────────────────────
    risk_score, risk_flags = compute_risk(user_prompt, response_text)

    # ── Langfuse trace ────────────────────────────────────────────────────────
    trace_id = langfuse_svc.trace_chat(
        session_id=session_id,
        user_id=req.user_id,
        model=req.model,
        messages=messages,
        response_text=response_text,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        latency_ms=latency_ms,
        metadata={"risk_score": risk_score, "risk_flags": risk_flags},
    )

    if trace_id:
        langfuse_svc.score(trace_id, "risk_score", risk_score)

    # ── Write audit log ───────────────────────────────────────────────────────
    log = AuditLog(
        session_id=session_id,
        trace_id=trace_id,
        model=req.model,
        prompt=user_prompt,
        response=response_text,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        latency_ms=latency_ms,
        risk_score=risk_score,
        risk_flags=risk_flags,
        status=status,
        user_id=req.user_id,
    )
    db.add(log)

    # ── Update model registry stats ───────────────────────────────────────────
    result = await db.execute(select(ModelRegistry).where(ModelRegistry.name == req.model))
    model_rec = result.scalar_one_or_none()
    if model_rec:
        old_avg = model_rec.avg_latency_ms
        old_count = model_rec.total_calls
        new_avg = (old_avg * old_count + latency_ms) / (old_count + 1)
        model_rec.total_calls = old_count + 1
        model_rec.avg_latency_ms = new_avg
        model_rec.last_used = datetime.now(timezone.utc)

    await db.flush()

    return ChatResponse(
        id=log.id,
        session_id=session_id,
        trace_id=trace_id,
        model=req.model,
        message={"role": "assistant", "content": response_text},
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        latency_ms=round(latency_ms, 2),
        risk_score=risk_score,
        risk_flags=risk_flags,
        status=status,
    )


@router.post("/stream")
async def chat_stream(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """SSE streaming chat endpoint."""
    import time
    session_id = req.session_id or str(uuid.uuid4())
    messages = [m.model_dump() for m in req.messages]
    user_prompt = messages[-1]["content"] if messages else ""

    pre_risk, pre_flags = compute_risk(user_prompt)
    if pre_risk >= BLOCK_THRESHOLD:
        raise HTTPException(status_code=451, detail="Blocked by Zero-Trust policy.")

    async def generate():
        full_response = ""
        t0 = time.perf_counter()
        try:
            async for chunk in ollama.chat_stream(req.model, messages, req.options):
                full_response += chunk
                yield f"data: {chunk}\n\n"
        except Exception as exc:
            yield f"data: [ERROR] {exc}\n\n"
            return
        finally:
            latency_ms = (time.perf_counter() - t0) * 1000
            risk_score, risk_flags = compute_risk(user_prompt, full_response)
            trace_id = langfuse_svc.trace_chat(
                session_id=session_id,
                user_id=req.user_id,
                model=req.model,
                messages=messages,
                response_text=full_response,
                prompt_tokens=ollama._estimate_tokens(messages),
                completion_tokens=ollama._estimate_tokens_text(full_response),
                latency_ms=latency_ms,
            )
            log = AuditLog(
                session_id=session_id,
                trace_id=trace_id,
                model=req.model,
                prompt=user_prompt,
                response=full_response,
                latency_ms=latency_ms,
                risk_score=risk_score,
                risk_flags=risk_flags,
                status="success",
                user_id=req.user_id,
            )
            db.add(log)
            await db.commit()
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
