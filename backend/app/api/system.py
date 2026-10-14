"""Health, scheduler tick, workspace SSE events (02 §3.3, 03 §10.4)."""

import asyncio
import hmac
import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends, Header, Request
from sse_starlette.sse import EventSourceResponse

from app.auth.deps import WorkspaceContext, any_status, platform_repo
from app.config import get_settings
from app.errors import ApiError
from app.graph.client import get_db
from app.graph.schema import PLATFORM, ensure_schema
from app.ids import now
from app.services import events, sentinel

router = APIRouter()
STALE_S = 3600


def _internal(secret: str | None) -> None:
    expected = get_settings().internal_tick_secret
    if not expected or not secret or not hmac.compare_digest(secret, expected):
        raise ApiError("UNAUTHENTICATED", "Invalid or missing internal secret.")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "reprieve-backend", "engine": "falkordb"}


@router.get("/internal/health/deep")
async def deep_health(x_internal_secret: str | None = Header(None)) -> dict[str, Any]:
    _internal(x_internal_secret)
    graphs = await get_db().list_graphs()
    return {"status": "ok", "falkordb": True, "graphs": len(graphs)}


@router.post("/internal/sentinel/tick")
async def tick(x_internal_secret: str | None = Header(None)) -> dict[str, Any]:
    _internal(x_internal_secret)
    ids = [r["id"] for r in await platform_repo().read("p_tick_candidates", stale_before=now() - STALE_S)]
    results = {ws: await sentinel.run(ws, "schedule") for ws in ids}
    return {"ran": [ws for ws, r in results.items() if r is not None]}


@router.get("/api/v1/workspaces/{ws_id}/events")
async def workspace_events(
    request: Request, ctx: WorkspaceContext = Depends(any_status)
) -> EventSourceResponse:  # open during provisioning
    q = events.subscribe(ctx.ws_id)
    user_id = ctx.user.id

    async def stream() -> AsyncIterator[dict[str, str]]:
        try:
            while not await request.is_disconnected():
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=15)
                except TimeoutError:
                    continue  # sse-starlette sends the ping comment
                recipient = msg["data"].get("recipient_user_id")
                if recipient and recipient != user_id:
                    continue
                yield {"event": msg["event"], "data": json.dumps(msg["data"])}
        finally:
            events.unsubscribe(ctx.ws_id, q)

    return EventSourceResponse(stream(), ping=15)


async def bootstrap() -> None:
    await ensure_schema(platform_repo(), PLATFORM)
