"""Tool registry shared by Steward (and MCP later). Reads only; writes are returned as ProposedActions (03 §12.1)."""

import json
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from cachetools import TTLCache
from pydantic import BaseModel, Field, ValidationError

from app.api import data as data_api
from app.api import risk_alerts
from app.auth.deps import WorkspaceContext
from app.detection.config import load_config
from app.detection.engine import run_rules
from app.errors import ApiError
from app.ids import DAY, new_id, now
from app.memory.store import precedent
from app.models.api import Role
from app.prediction.engine import run_prediction_simulation
from app.services import reviews, views

ID_RE = re.compile(r"\b(?:exc|svc|per|team|ctl|cc|cp|rbk|alt|rev|ev)_[a-z0-9_-]+\b")
LABEL_OF = {
    "exc": "Exception",
    "svc": "Service",
    "per": "Person",
    "team": "Team",
    "ctl": "Control",
    "cc": "CompensatingControl",
    "cp": "CustomerPath",
    "rbk": "Runbook",
    "alt": "Alert",
    "rev": "Review",
    "ev": "Evidence",
}


@dataclass
class ToolResult:
    data: Any
    summary: str
    known: dict[str, str] = field(default_factory=dict)  # id → display label, for citations
    proof_paths: list[dict[str, Any]] = field(default_factory=list)
    action: dict[str, Any] | None = None


def collect_known(obj: Any, out: dict[str, str]) -> None:
    """Every id-shaped value in a tool result becomes citable, labelled with the nearest name."""
    if isinstance(obj, dict):
        oid = obj.get("id")
        if isinstance(oid, str) and ID_RE.fullmatch(oid):
            out.setdefault(oid, str(obj.get("label") or obj.get("name") or obj.get("title") or oid))
        for v in obj.values():
            collect_known(v, out)
    elif isinstance(obj, list):
        for v in obj:
            collect_known(v, out)
    elif isinstance(obj, str) and ID_RE.fullmatch(obj):
        out.setdefault(obj, obj)


# ---------------------------------------------------------------- argument models
class Limit(BaseModel):
    limit: int = Field(5, ge=1, le=25)


class ServiceArg(BaseModel):
    service_id: str


class AlertFilter(BaseModel):
    rule: str | None = Field(None, description="R1..R8")
    severity: str | None = Field(None, description="low|moderate|high|critical")
    limit: int = Field(10, ge=1, le=25)


class AlertArg(BaseModel):
    alert_id: str


class ExceptionFilter(BaseModel):
    effective_status: str | None = Field(None, description="active|expiring|expired|renewed|revoked|closed|draft")
    service_id: str | None = None
    owner_id: str | None = None
    q: str | None = None
    limit: int = Field(10, ge=1, le=25)


class ExceptionArg(BaseModel):
    exception_id: str


class PathArgs(BaseModel):
    from_id: str
    to_id: str


class SearchArgs(BaseModel):
    q: str = Field(..., min_length=1, max_length=100)


class PrecedentArgs(BaseModel):
    control_id: str
    service_id: str | None = None


class WhatIfArgs(BaseModel):
    days_from_now: int = Field(..., ge=-365, le=365, description="Offset from the workspace date, in days")


class ProposeArgs(BaseModel):
    alert_id: str
    exception_id: str | None = None
    rationale: str | None = Field(None, max_length=1000)


# ---------------------------------------------------------------- implementations
async def list_risk_services(ctx: WorkspaceContext, a: Limit) -> ToolResult:
    rows = await risk_alerts.risk_services(limit=a.limit, ctx=ctx)
    top = ", ".join(f"{r['service']['label']} {r['score']:.0f}" for r in rows[:3])
    return ToolResult(rows, f"Ranked {len(rows)} services (top: {top})")


async def explain_service(ctx: WorkspaceContext, a: ServiceArg) -> ToolResult:
    d = await risk_alerts.risk_service(a.service_id, ctx=ctx)
    alerts = [await views.get_alert(ctx, i) for i in d["alert_ids"][:5]]
    slim = [{k: x[k] for k in ("id", "rule_id", "severity", "title", "summary", "involved")} for x in alerts]
    proofs = [d["proof"]] if d["proof"] else []
    return ToolResult(
        {**d, "alerts": slim}, f"{d['service']['label']}: score {d['score']:.0f} ({d['band']})", proof_paths=proofs
    )


async def list_alerts(ctx: WorkspaceContext, a: AlertFilter) -> ToolResult:
    page = await risk_alerts.list_alerts(
        status="open,acknowledged,snoozed",
        severity=a.severity,
        rule=a.rule,
        subject_id=None,
        exception_id=None,
        limit=a.limit,
        cursor=None,
        ctx=ctx,
    )
    items = [
        {k: x[k] for k in ("id", "rule_id", "severity", "status", "title", "summary", "subject", "involved")}
        for x in page["items"]
    ]
    return ToolResult(items, f"{len(items)} open alerts")


async def get_alert(ctx: WorkspaceContext, a: AlertArg) -> ToolResult:
    al = await views.get_alert(ctx, a.alert_id)
    return ToolResult(al, al["title"], proof_paths=[al["proof"]])


async def list_exceptions(ctx: WorkspaceContext, a: ExceptionFilter) -> ToolResult:
    page = await data_api.list_exceptions(
        status_=None,
        effective_status=a.effective_status,
        kind=None,
        severity=None,
        service_id=a.service_id,
        owner_id=a.owner_id,
        expiring_within_days=None,
        q=a.q,
        limit=a.limit,
        cursor=None,
        ctx=ctx,
    )
    return ToolResult(page["items"], f"{len(page['items'])} exceptions")


async def get_exception(ctx: WorkspaceContext, a: ExceptionArg) -> ToolResult:
    e = await views.get_exception(ctx, a.exception_id)
    return ToolResult(e, f"{e['title']} ({e['effective_status']})")


async def find_current_owner(ctx: WorkspaceContext, a: ExceptionArg) -> ToolResult:
    chain = await reviews.resolve_owner(ctx, a.exception_id)
    first = chain[0]["person"]["label"] if chain else "nobody"
    return ToolResult(chain, f"First candidate: {first}")


async def proof_path(ctx: WorkspaceContext, a: PathArgs) -> ToolResult:
    p = await data_api.proof_path(from_=a.from_id, to=a.to_id, ctx=ctx)
    return ToolResult(p, p["summary"], proof_paths=[p])


async def search_entities(ctx: WorkspaceContext, a: SearchArgs) -> ToolResult:
    rows = await data_api.search(q=a.q, kinds=None, limit=10, ctx=ctx)
    return ToolResult(rows, f"{len(rows)} matches")


async def recall_precedent(ctx: WorkspaceContext, a: PrecedentArgs) -> ToolResult:
    rows = await precedent(ctx.mem, a.control_id, a.service_id)
    return ToolResult(rows, f"{len(rows)} prior decisions")


async def what_if_as_of(ctx: WorkspaceContext, a: WhatIfArgs) -> ToolResult:
    """Read-only evaluation at another date; nothing is persisted (replaces `simulate_clock` for the LLM)."""
    at = ctx.as_of + a.days_from_now * DAY
    res = await run_rules(ctx.org, await load_config(ctx.org), at)
    by_rule: dict[str, int] = {}
    for f in res.findings:
        by_rule[f.rule_id] = by_rule.get(f.rule_id, 0) + 1
    top = sorted(res.scores.values(), key=lambda s: -s["score"])[:5]
    data = {
        "as_of": at,
        "alerts_by_rule": by_rule,
        "top_services": [{"id": s["service_id"], "score": s["score"], "band": s["band"]} for s in top],
        "alerts": [
            {"rule_id": f.rule_id, "severity": f.severity, "title": f.title, "subject_id": f.subject_id}
            for f in res.findings[:15]
        ],
    }
    return ToolResult(data, f"Preview at +{a.days_from_now}d: {len(res.findings)} alerts (not saved)")


_actions: TTLCache[str, dict[str, Any]] = TTLCache(maxsize=1024, ttl=86400)


async def propose_review(ctx: WorkspaceContext, a: ProposeArgs) -> ToolResult:
    al = await views.get_alert(ctx, a.alert_id)
    involved = [x["id"] for x in al["involved"]]
    exc_id = a.exception_id if a.exception_id in involved else (involved[0] if involved else None)
    if not exc_id:
        return ToolResult({"error": "alert has no exceptions"}, "Cannot propose a review")
    chain = await reviews.resolve_owner(ctx, exc_id)
    action: dict[str, Any] = {
        "action_id": new_id("act"),
        "type": "create_review",
        "requires_role": Role.reviewer.value,
        "title": f"Open a review of {al['title']}",
        "expires_at": now() + DAY,
        "payload": {"alert_id": a.alert_id, "exception_id": exc_id, "rationale": a.rationale, "assignees": chain[:3]},
    }
    _actions[action["action_id"]] = {**action, "ws_id": ctx.ws_id}
    return ToolResult({"proposed": action}, "Drafted a review proposal (needs approval)", action=action)


def pop_action(ws_id: str, action_id: str) -> dict[str, Any]:
    act = _actions.get(action_id)
    if not act or act["ws_id"] != ws_id:
        raise ApiError("NOT_FOUND", "This proposal expired. Ask Steward again.")
    del _actions[action_id]
    return act


class PredictAvalancheArgs(BaseModel):
    service_id: str = Field(description="Target service id, e.g. svc_billing.")


async def predict_avalanche(ctx: WorkspaceContext, a: PredictAvalancheArgs) -> ToolResult:
    forecast = await run_prediction_simulation(ctx.org, as_of=ctx.as_of, target_service_id=a.service_id)
    item = next((it for it in forecast.avalanche_centrality if it.service_id == a.service_id), None)
    if not item:
        return ToolResult({"error": f"Service {a.service_id} not found in prediction graph"}, f"Service {a.service_id} not found")
    data = item.model_dump()
    proof_path = [e.model_dump() for e in item.proof.edges]
    return ToolResult(
        data=data,
        summary=f"Avalanche Centrality for {item.service_name}: score {item.score} ({item.band} risk, SPOF rank #{item.spof_rank})",
        proof_paths=proof_path,
    )


class PredictCollisionsArgs(BaseModel):
    horizon_days: int = Field(default=30, ge=1, le=365, description="Forecast horizon in days.")
    window_days: int = Field(default=7, ge=1, le=30, description="Collision window in days.")


async def predict_expiry_collisions(ctx: WorkspaceContext, a: PredictCollisionsArgs) -> ToolResult:
    forecast = await run_prediction_simulation(ctx.org, as_of=ctx.as_of, horizon_days=a.horizon_days)
    clusters = forecast.temporal_collisions
    data = [c.model_dump() for c in clusters]
    return ToolResult(
        data=data,
        summary=f"Found {len(clusters)} temporal expiry collision clusters within {a.horizon_days}d horizon.",
    )


def _debug_dump_tool_manifest() -> list[str]:
    """Temporary diagnostic utility: return list of registered tool names.
    Scheduled for cleanup in Milestone 6 when MCP REST routes are finalized.
    """
    return list(TOOLS.keys())


Impl = Callable[[WorkspaceContext, Any], Awaitable[ToolResult]]
TOOLS: dict[str, tuple[type[BaseModel], Impl, str]] = {
    "list_risk_services": (Limit, list_risk_services, "Rank services by deterministic risk score (highest first)."),
    "explain_service": (
        ServiceArg,
        explain_service,
        "Score breakdown, rule hits, alerts and proof path for a service.",
    ),
    "list_alerts": (AlertFilter, list_alerts, "List open alerts, optionally filtered by rule or severity."),
    "get_alert": (AlertArg, get_alert, "One alert with its proof path and contributing exceptions."),
    "list_exceptions": (ExceptionFilter, list_exceptions, "List exceptions with filters."),
    "get_exception": (ExceptionArg, get_exception, "One exception with owner, control, services, renewal chain."),
    "find_current_owner": (
        ExceptionArg,
        find_current_owner,
        "Ranked accountable people for an exception, with reasons.",
    ),
    "proof_path": (PathArgs, proof_path, "Shortest relationship path between two entities."),
    "search_entities": (SearchArgs, search_entities, "Find entities by name or id."),
    "recall_precedent": (PrecedentArgs, recall_precedent, "Past review decisions for a control (and service)."),
    "what_if_as_of": (WhatIfArgs, what_if_as_of, "Preview alerts and ranking at another date. Read-only."),
    "predict_avalanche": (
        PredictAvalancheArgs,
        predict_avalanche,
        "Predict cascading failure probability and Avalanche Centrality for a service.",
    ),
    "predict_expiry_collisions": (
        PredictCollisionsArgs,
        predict_expiry_collisions,
        "Predict future temporal clusters of simultaneous exception expirations across dependencies.",
    ),
    "propose_review": (ProposeArgs, propose_review, "Draft a review for an alert. A human must approve it."),
}


def openai_tools(read_only: bool) -> list[dict[str, Any]]:
    return [
        {"type": "function", "function": {"name": n, "description": d, "parameters": m.model_json_schema()}}
        for n, (m, _, d) in TOOLS.items()
        if not (read_only and n.startswith("propose_"))
    ]


async def call(ctx: WorkspaceContext, impl: Impl, args: BaseModel) -> ToolResult:
    result = await impl(ctx, args)
    collect_known(result.data, result.known)
    return result


async def execute(ctx: WorkspaceContext, name: str, raw_args: str) -> ToolResult:
    if name not in TOOLS:
        return ToolResult({"error": f"unknown tool {name}"}, "Unknown tool")
    model, impl, _ = TOOLS[name]
    try:
        args = model.model_validate(json.loads(raw_args or "{}"))
        result = await impl(ctx, args)
    except (ValidationError, json.JSONDecodeError) as ex:
        return ToolResult({"error": f"invalid arguments: {ex}"}, "Invalid arguments")
    except ApiError as ex:
        return ToolResult({"error": ex.detail or ex.code}, ex.detail or ex.code)
    collect_known(result.data, result.known)
    return result
