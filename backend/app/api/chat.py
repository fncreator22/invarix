"""Steward chat (FR-STW-01..10): sessions, streaming turns, quick answers, proposed-action approval."""

import json
import time
from collections import defaultdict, deque
from collections.abc import AsyncIterator
from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.agents import quick, steward, tools
from app.auth.deps import WorkspaceContext, viewer
from app.errors import ApiError, not_found
from app.ids import new_id, now
from app.models.api import ROLE_RANK, ChatIn, Role
from app.services import reviews

router = APIRouter(prefix="/workspaces/{ws_id}")

# ponytail: in-process sliding windows (single instance); move to a shared store if the API scales out
_per_user: dict[str, deque[float]] = defaultdict(deque)
_per_ws_day: dict[tuple[str, int], int] = defaultdict(int)
USER_PER_MIN, WS_PER_DAY = 10, 50


def _rate_limit(ctx: WorkspaceContext) -> None:
    t = time.time()
    q = _per_user[ctx.user.id]
    while q and t - q[0] > 60:
        q.popleft()
    if len(q) >= USER_PER_MIN:
        raise ApiError(
            "RATE_LIMITED", "Too many messages. Wait a moment.", headers={"Retry-After": str(int(61 - (t - q[0])))}
        )
    day = (ctx.ws_id, int(t) // 86400)
    if _per_ws_day[day] >= WS_PER_DAY:
        raise ApiError(
            "QUOTA_EXCEEDED", "This workspace reached today's Steward message limit. Quick answers still work."
        )
    q.append(t)
    _per_ws_day[day] += 1


@router.post("/chat/sessions", status_code=201)
async def create_session(ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    rows = await ctx.mem.write(
        "mem_session_create", id=new_id("ses"), user_id=ctx.user.id, title=None, now=now(), as_of=ctx.as_of
    )
    return rows[0]["s"]


@router.get("/chat/sessions")
async def list_sessions(ctx: WorkspaceContext = Depends(viewer)) -> list[dict[str, Any]]:
    return [r["s"] for r in await ctx.mem.read("mem_sessions", user_id=ctx.user.id, limit=50)]


@router.get("/chat/sessions/{session_id}")
async def get_session(session_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    rows = await ctx.mem.read("mem_session_turns", id=session_id, user_id=ctx.user.id)
    if not rows:
        raise not_found("session")
    turns = [{**t, "citations": json.loads(t.get("citations_json") or "[]")} for t in rows[0]["turns"] if t]
    return {**rows[0]["s"], "turns": turns}


@router.delete("/chat/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str, ctx: WorkspaceContext = Depends(viewer)) -> None:
    if not (await ctx.mem.write("mem_session_delete", id=session_id, user_id=ctx.user.id))[0]["n"]:
        raise not_found("session")


@router.post("/chat/sessions/{session_id}/messages")
async def message(session_id: str, body: ChatIn, ctx: WorkspaceContext = Depends(viewer)) -> EventSourceResponse:
    if not await ctx.mem.read("mem_session_turns", id=session_id, user_id=ctx.user.id):
        raise not_found("session")
    if ctx.workspace.get("ai_mode") == "off":
        raise ApiError("AI_DISABLED", "AI is turned off for this workspace. Quick answers still work.")
    _rate_limit(ctx)

    async def stream() -> AsyncIterator[dict[str, str]]:
        try:
            async for event, data in steward.turn(ctx, session_id, body.content, body.context):
                yield {"event": event, "data": json.dumps(data, default=str)}
        except ApiError as ex:
            yield {"event": "error", "data": json.dumps({"code": ex.code, "message": ex.detail})}
        except Exception:
            yield {"event": "error", "data": json.dumps({"code": "INTERNAL", "message": "Steward hit an error."})}

    return EventSourceResponse(stream(), ping=15)


class QuickIn(BaseModel):
    kind: Literal["top_risk", "owner"]
    exception_id: str | None = None


@router.post("/chat/quick")
async def quick_answer(body: QuickIn, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    if body.kind == "owner":
        if not body.exception_id:
            raise ApiError("VALIDATION_ERROR", "Pick an exception.", [{"field": "exception_id", "message": "Required"}])
        return await quick.owner(ctx, body.exception_id)
    return await quick.top_risk(ctx)


@router.post("/chat/actions/{action_id}/approve")
async def approve_action(action_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    act = tools.pop_action(ctx.ws_id, action_id)
    if ROLE_RANK[ctx.role] < ROLE_RANK[Role(act["requires_role"])] or act["expires_at"] < now():
        raise ApiError("FORBIDDEN", f"Approving this needs the {act['requires_role']} role.")
    p = act["payload"]
    review_id = await reviews.propose(ctx, p["alert_id"], p["exception_id"], p.get("rationale"))
    return {"type": act["type"], "review": await reviews.review_out(ctx, review_id)}
