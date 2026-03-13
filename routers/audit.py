"""Audit log router — query and inspect recorded interactions."""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from database import get_db
from models import AuditLog
from schemas import AuditListResponse, AuditLogOut

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("", response_model=AuditListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    model: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    risk_min: Optional[float] = Query(None, ge=0.0, le=1.0),
    risk_max: Optional[float] = Query(None, ge=0.0, le=1.0),
    search: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditLog).order_by(AuditLog.created_at.desc())

    if model:
        q = q.where(AuditLog.model == model)
    if status:
        q = q.where(AuditLog.status == status)
    if risk_min is not None:
        q = q.where(AuditLog.risk_score >= risk_min)
    if risk_max is not None:
        q = q.where(AuditLog.risk_score <= risk_max)
    if search:
        q = q.where(
            or_(
                AuditLog.prompt.ilike(f"%{search}%"),
                AuditLog.response.ilike(f"%{search}%"),
            )
        )
    if session_id:
        q = q.where(AuditLog.session_id == session_id)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    return AuditListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[AuditLogOut.model_validate(r) for r in rows],
    )


@router.get("/{audit_id}", response_model=AuditLogOut)
async def get_audit_log(audit_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(AuditLog, audit_id)
    if not row:
        raise HTTPException(status_code=404, detail="Audit log not found.")
    return AuditLogOut.model_validate(row)


@router.delete("/{audit_id}", status_code=204)
async def delete_audit_log(audit_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(AuditLog, audit_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found.")
    await db.delete(row)
