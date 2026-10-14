"""Risk ranking and alerts (03 §10.2: alerts, risk)."""

import json
from typing import Any

from fastapi import APIRouter, Depends, Header, Query

from app.auth.deps import WorkspaceContext, member, reviewer, viewer
from app.errors import ApiError, not_found
from app.ids import DAY, now
from app.models.api import (
    AlertOut,
    FeedbackIn,
    Page,
    ProposeReviewIn,
    ResolveIn,
    RiskSummary,
    RunwayItem,
    ServiceRisk,
    ServiceRiskDetail,
    SnoozeIn,
    TrendPoint,
)
from app.services import events, reviews, views
from app.services.audit import audit

router = APIRouter(prefix="/workspaces/{ws_id}")


def _csv(v: str | None) -> list[str] | None:
    return [x for x in v.split(",") if x] if v else None


@router.get("/risk/summary", response_model=RiskSummary)
async def risk_summary(ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    rows = await ctx.org.read("risk_summary", as_of=ctx.as_of, person_id=ctx.person_id or "")
    alerts = {s: 0 for s in ("critical", "high", "moderate", "low")}
    active = expiring = mine = 0
    for r in rows:
        if r["kind"] == "alert":
            alerts[r["key"]] = r["n"]
        elif r["kind"] == "active":
            active += r["n"]
            expiring += r["n"] if r["key"] == "expiring_7d" else 0
        else:
            mine = r["n"]
    return {
        "as_of": ctx.as_of,
        "open_alerts": alerts,
        "active_exceptions": active,
        "expiring_7d": expiring,
        "my_reviews": mine,
    }


@router.get("/risk/services", response_model=list[ServiceRisk])
async def risk_services(limit: int = Query(25, ge=1, le=100), ctx: WorkspaceContext = Depends(viewer)) -> list[Any]:
    rows = await ctx.org.read("risk_services", service_id=None)
    return [views.service_risk(r) for r in rows[:limit]]


@router.get("/risk/services/{service_id}", response_model=ServiceRiskDetail)
async def risk_service(service_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    rows = await ctx.org.read("risk_services", service_id=service_id)
    if not rows:
        raise not_found("service")
    r = rows[0]
    breakdown: dict[str, Any] = (
        json.loads(r["risk_json"])
        if r["risk_json"]
        else {
            "service_id": service_id,
            "raw": 0,
            "multiplier": 1,
            "score": 0,
            "band": "low",
            "contributions": [],
            "rule_hits": [],
            "config_version": 1,
            "as_of": ctx.as_of,
        }
    )
    alerts = await ctx.org.read("alerts_about", id=service_id)
    r4 = next((a for a in alerts if a["rule_id"] == "R4"), None)
    proof = (await views.get_alert(ctx, r4["id"]))["proof"] if r4 else None
    ids = [c["exception_id"] for c in breakdown["contributions"]]
    names = {n["id"]: n["name"] for n in await ctx.org.read("hydrate_nodes", ids=ids)} if ids else {}
    return {
        **views.service_risk(r),
        "breakdown": breakdown,
        "proof": proof,
        "alert_ids": [a["id"] for a in alerts],
        "names": names,
    }


@router.get("/risk/trend", response_model=list[TrendPoint])
async def risk_trend(
    service_id: str, days: int = Query(90, ge=1, le=365), ctx: WorkspaceContext = Depends(viewer)
) -> list[dict[str, Any]]:
    return await ctx.org.read("risk_trend", service_id=service_id, since=ctx.as_of - days * DAY)


@router.get("/risk/runway", response_model=list[RunwayItem])
async def risk_runway(days: int = Query(30, ge=1, le=120), ctx: WorkspaceContext = Depends(viewer)) -> list[Any]:
    rows = await ctx.org.read("dash_runway", as_of=ctx.as_of, horizon_s=days * DAY)
    return [
        {
            "team": {"kind": "Team", "id": r["team_id"], "label": r["team"]},
            "exception": {"kind": "Exception", "id": r["exception_id"], "label": r["title"]},
            "expires_at": r["expires_at"],
            "severity": r["severity"],
        }
        for r in rows
    ]


@router.get("/alerts", response_model=Page[AlertOut])
async def list_alerts(
    status: str | None = Query("open,acknowledged,snoozed"),
    severity: str | None = None,
    rule: str | None = None,
    subject_id: str | None = None,
    exception_id: str | None = None,
    limit: int = Query(25, ge=1, le=100),
    cursor: str | None = None,
    ctx: WorkspaceContext = Depends(viewer),
) -> dict[str, Any]:
    skip = views.parse_cursor(cursor)
    rows = await ctx.org.read(
        "alerts_list",
        statuses=_csv(status),
        severities=_csv(severity),
        rules=_csv(rule),
        subject_id=subject_id,
        involves=exception_id,
        skip=skip,
        limit=limit,
    )
    return {"items": [views.alert_out(r) for r in rows], "next_cursor": views.cursor(skip, limit, len(rows))}


@router.get("/alerts/{alert_id}", response_model=AlertOut)
async def get_alert(alert_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    return await views.get_alert(ctx, alert_id)


async def _set(ctx: WorkspaceContext, alert_id: str, version: int | None, action: str, **fields: Any) -> dict[str, Any]:
    if not await ctx.org.write(
        "alert_set", **{**reviews.alert_unset(), **fields}, id=alert_id, version=version, now=now()
    ):
        if not await ctx.org.read("alert_get", id=alert_id):
            raise not_found("alert")
        raise ApiError("VERSION_CONFLICT", f"Alert {alert_id} changed since you loaded it.")
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action=f"alert.{action}",
        target_kind="Alert",
        target_id=alert_id,
        diff={k: v for k, v in fields.items() if v is not None},
    )
    events.publish(ctx.ws_id, "alert.updated", {"id": alert_id})
    return await views.get_alert(ctx, alert_id)


def _version(if_match: str | None) -> int | None:
    return int(if_match.strip('"')) if if_match and if_match.strip('"').isdigit() else None


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge(
    alert_id: str, if_match: str | None = Header(None), ctx: WorkspaceContext = Depends(reviewer)
) -> dict[str, Any]:
    return await _set(
        ctx, alert_id, _version(if_match), "acknowledged", status="acknowledged", ack_by=ctx.user.id, ack_at=now()
    )


@router.post("/alerts/{alert_id}/snooze", response_model=AlertOut)
async def snooze(
    alert_id: str, body: SnoozeIn, if_match: str | None = Header(None), ctx: WorkspaceContext = Depends(reviewer)
) -> dict[str, Any]:
    if body.until <= ctx.as_of:
        raise ApiError("VALIDATION_ERROR", "Snooze until a later date.", [{"field": "until", "message": "In the past"}])
    return await _set(
        ctx,
        alert_id,
        _version(if_match),
        "snoozed",
        status="snoozed",
        snoozed_until=body.until,
        snooze_reason=body.reason,
    )


@router.post("/alerts/{alert_id}/resolve", response_model=AlertOut)
async def resolve(
    alert_id: str, body: ResolveIn, if_match: str | None = Header(None), ctx: WorkspaceContext = Depends(reviewer)
) -> dict[str, Any]:
    return await _set(
        ctx, alert_id, _version(if_match), "resolved", status="resolved", resolution="manual", resolution_note=body.note
    )


@router.post("/alerts/{alert_id}/feedback", response_model=AlertOut)
async def feedback(alert_id: str, body: FeedbackIn, ctx: WorkspaceContext = Depends(member)) -> dict[str, Any]:
    return await _set(
        ctx, alert_id, None, "feedback", feedback="useful" if body.useful else "not_useful", feedback_note=body.note
    )


@router.get("/alerts/{alert_id}/owner-candidates")
async def owner_candidates(
    alert_id: str, exception_id: str | None = None, ctx: WorkspaceContext = Depends(viewer)
) -> list[dict[str, Any]]:
    alert = await views.get_alert(ctx, alert_id)
    exc_id = exception_id or (alert["involved"][0]["id"] if alert["involved"] else None)
    if not exc_id:
        return []
    return await reviews.resolve_owner(ctx, exc_id)


@router.post("/alerts/{alert_id}/propose-review", status_code=201)
async def propose_review(alert_id: str, body: ProposeReviewIn, ctx: WorkspaceContext = Depends(reviewer)) -> Any:
    review_id = await reviews.propose(ctx, alert_id, body.exception_id, body.rationale)
    return await reviews.review_out(ctx, review_id)


@router.get("/alerts/{alert_id}/explain")
async def explain_alert(alert_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    from app.agents.explain import explain

    rows = await ctx.org.read("alert_get", id=alert_id)
    if not rows:
        raise not_found("alert")
    return await explain(ctx, views.alert_out(rows[0]), rows[0]["a"])
