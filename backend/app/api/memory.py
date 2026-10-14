"""Memory graph reads (03 §10.2: /memory/outcomes, /memory/precedent, /memory/handoffs)."""

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.auth.deps import WorkspaceContext, viewer
from app.memory.store import precedent

router = APIRouter(prefix="/workspaces/{ws_id}/memory")


@router.get("/outcomes")
async def outcomes(
    limit: int = Query(50, ge=1, le=200), ctx: WorkspaceContext = Depends(viewer)
) -> list[dict[str, Any]]:
    return await ctx.mem.read("mem_outcomes", limit=limit)


@router.get("/precedent")
async def get_precedent(
    control_id: str, service_id: str | None = None, ctx: WorkspaceContext = Depends(viewer)
) -> list[dict[str, Any]]:
    return await precedent(ctx.mem, control_id, service_id)


@router.get("/handoffs")
async def handoffs(
    status: str | None = Query(None, pattern="^(open|claimed|done|failed)$"), ctx: WorkspaceContext = Depends(viewer)
) -> list[dict[str, Any]]:
    return [r["h"] for r in await ctx.mem.read("mem_handoffs", status=status, limit=100)]
