"""Text ingestion → staged drafts → human approve/reject (FR-REG-08, T-046). Included before the data router so
`/exceptions/drafts` wins over `/exceptions/{id}`."""

import hashlib
import json
import time
from collections import defaultdict, deque
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth.deps import WorkspaceContext, member, reviewer, viewer
from app.errors import ApiError, not_found
from app.ids import DAY, new_id, now
from app.ingest.extractor import extract
from app.ingest.loaders import load_bundle
from app.ingest.resolver import resolve
from app.services import sentinel, views
from app.services.audit import audit

router = APIRouter(prefix="/workspaces/{ws_id}/exceptions")
_window: dict[str, deque[float]] = defaultdict(deque)
PER_HOUR = 10


class IngestIn(BaseModel):
    text: Annotated[str, Field(min_length=20, max_length=20000)]
    source_ref: str | None = Field(None, max_length=300)


class ApproveIn(BaseModel):
    owner_id: str | None = None
    control_id: str | None = None
    service_ids: list[str] | None = None
    expires_at: int | None = None
    severity: int | None = Field(None, ge=1, le=5)
    title: str | None = Field(None, min_length=3, max_length=160)


def _draft_out(row: dict[str, Any]) -> dict[str, Any]:
    e = row["e"]
    staged = json.loads(e.get("staged_json") or "{}")
    return {
        "id": e["id"],
        "title": e["title"],
        "kind": e["kind"],
        "severity": e["severity"],
        "granted_at": e["granted_at"],
        "expires_at": e["expires_at"],
        "description": e.get("description"),
        "control": views.ref("Control", row["control"]),
        "owner": views.ref("Person", row["owner"]),
        "services": views.refs("Service", row["services"]),
        "unresolved": staged.get("unresolved", {}),
        "warnings": staged.get("warnings", []),
        "hints": staged.get("hints", {}),
        "version": e["version"],
    }


def _limit(ws_id: str, user_kind: str = "") -> None:
    if user_kind == "cli_machine":
        return
    q, t = _window[ws_id], time.time()
    while q and t - q[0] > 3600:
        q.popleft()
    if len(q) >= PER_HOUR:
        raise ApiError("RATE_LIMITED", "Text ingestion is limited to 10 per hour.", headers={"Retry-After": "600"})
    q.append(t)


@router.post("/ingest-text", status_code=201)
async def ingest_text(body: IngestIn, ctx: WorkspaceContext = Depends(member)) -> dict[str, Any]:
    if ctx.workspace.get("ai_mode") == "off":
        raise ApiError("AI_DISABLED", "AI is turned off for this workspace.")
    _limit(ctx.ws_id, getattr(ctx.user, "clerk_user_id", ""))
    x = await extract(ctx.ws_id, ctx.workspace.get("ai_mode", "cloud"), body.text)
    reg = await ctx.org.read("registry_snapshot")
    by = defaultdict(list)
    for r in reg:
        by[r["label"]].append(r)
    res = resolve(x, by["Person"], by["Service"], by["Control"])
    draft_id = new_id("exc")
    staged = {
        "unresolved": res["unresolved"],
        "warnings": x.warnings,
        "hints": {
            "owner": x.owner_hint.model_dump() if x.owner_hint else None,
            "services": x.service_hints,
            "control": x.control_hint,
            "compensating_control": x.compensating_control_description,
        },
    }
    await ctx.org.write(
        "draft_create",
        id=draft_id,
        title=x.title,
        kind=x.kind,
        severity=x.severity_suggested,
        granted_at=ctx.as_of,
        expires_at=ctx.as_of + (x.duration_days or 30) * DAY,
        description=x.compensating_control_description,
        now=now(),
        actor=ctx.user.id,
        staged_json=json.dumps(staged),
        control_id=res["control_id"],
        owner_id=res["owner_id"],
        approver_id=res["approver_id"],
        service_ids=res["service_ids"],
    )
    if x.evidence_excerpt:
        await load_bundle(
            ctx.org,
            {
                "bundle_version": 1,
                "evidence": [
                    {
                        "id": new_id("ev"),
                        "exception_id": draft_id,
                        "kind": "chat",
                        "source_ref": body.source_ref or "pasted text",
                        "captured_at": now(),
                        "excerpt": x.evidence_excerpt,
                        "content_hash": hashlib.sha256(body.text.encode()).hexdigest(),
                    }
                ],
            },
            source="ingest",
            actor=ctx.user.id,
        )
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action="exception.staged",
        target_kind="Exception",
        target_id=draft_id,
        summary=x.title,
        diff={"warnings": x.warnings},
    )
    return await _get_draft(ctx, draft_id)


async def _get_draft(ctx: WorkspaceContext, draft_id: str) -> dict[str, Any]:
    for row in await ctx.org.read("drafts_list"):
        if row["e"]["id"] == draft_id:
            return _draft_out(row)
    raise not_found("draft")


@router.get("/drafts")
async def list_drafts(ctx: WorkspaceContext = Depends(viewer)) -> list[dict[str, Any]]:
    return [_draft_out(r) for r in await ctx.org.read("drafts_list")]


@router.get("/drafts/{draft_id}/impact-preview")
async def draft_impact_preview(draft_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    """Read-only: show how approving this draft would affect the risk graph.

    Returns the current baseline top-risk services and the services the draft
    would touch, so the reviewer can assess risk before approving.
    Does not persist anything or modify state.
    """
    from app.prediction.engine import run_prediction_simulation

    d = await _get_draft(ctx, draft_id)
    affected_services = [s["label"] for s in d.get("services", []) if s]
    affected_ids = [s["id"] for s in d.get("services", []) if s]

    # Run baseline prediction (30-day horizon)
    baseline = await run_prediction_simulation(ctx.org, as_of=ctx.as_of, horizon_days=30)

    # Identify top-5 risk services from baseline
    top_services = sorted(
        baseline.canvas_decorations.items(),
        key=lambda kv: -kv[1].simulated_score,
    )[:5]

    # Check if any affected services are already high risk
    high_risk_affected = [
        {
            "service_id": sid,
            "current_score": baseline.canvas_decorations[sid].simulated_score,
            "current_band": baseline.canvas_decorations[sid].risk_band,
        }
        for sid in affected_ids
        if sid in baseline.canvas_decorations
        and baseline.canvas_decorations[sid].simulated_score >= 50.0
    ]

    severity = d.get("severity", 3)
    horizon_note = (
        "CAUTION: This draft affects already high-risk services. Approving may push them to CRITICAL."
        if high_risk_affected and severity >= 4
        else "Approve to add this exception to the risk graph. Sentinel will re-evaluate automatically."
    )

    return {
        "draft_id": draft_id,
        "draft_title": d["title"],
        "draft_severity": severity,
        "affected_services": affected_services,
        "high_risk_affected_services": high_risk_affected,
        "baseline_top_services": [
            {
                "service_id": sid,
                "simulated_score": dec.simulated_score,
                "risk_band": dec.risk_band,
                "is_spof": dec.is_spof,
            }
            for sid, dec in top_services
        ],
        "horizon_days": 30,
        "horizon_note": horizon_note,
        "warnings": d.get("warnings", []),
    }


@router.post("/drafts/{draft_id}/approve")
async def approve(draft_id: str, body: ApproveIn, ctx: WorkspaceContext = Depends(reviewer)) -> dict[str, Any]:
    d = await _get_draft(ctx, draft_id)
    owner_id = body.owner_id or (d["owner"] or {}).get("id")
    control_id = body.control_id or (d["control"] or {}).get("id")
    service_ids = body.service_ids or [s["id"] for s in d["services"]]
    expires_at = body.expires_at or d["expires_at"]
    errors = [
        {"field": f, "message": "Required before approval"}
        for f, v in (("owner_id", owner_id), ("control_id", control_id), ("service_ids", service_ids))
        if not v
    ]
    if expires_at <= ctx.as_of:
        errors.append({"field": "expires_at", "message": "Must be after today"})
    if errors:
        raise ApiError("VALIDATION_ERROR", "Complete the draft before approving.", errors)
    if not await ctx.org.write(
        "draft_complete",
        id=draft_id,
        control_id=control_id,
        owner_id=owner_id,
        service_ids=service_ids,
        expires_at=expires_at,
        severity=body.severity or d["severity"],
        title=body.title or d["title"],
        now=now(),
    ):
        raise ApiError(
            "VALIDATION_ERROR",
            "Owner must be an active person and the control must exist.",
            [{"field": "owner_id", "message": "Check owner and control"}],
        )
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action="exception.approved",
        target_kind="Exception",
        target_id=draft_id,
    )
    await sentinel.mark_dirty(ctx.ws_id)
    return await views.get_exception(ctx, draft_id)


@router.post("/drafts/{draft_id}/reject", status_code=204)
async def reject(draft_id: str, ctx: WorkspaceContext = Depends(reviewer)) -> None:
    if not (await ctx.org.write("draft_delete", id=draft_id))[0]["n"]:
        raise not_found("draft")
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action="exception.rejected",
        target_kind="Exception",
        target_id=draft_id,
    )


class ManifestIngestIn(BaseModel):
    manifest_content: str = Field(..., min_length=20, max_length=1_000_000)
    source_ref: str | None = Field(None, max_length=300)
    auto_persist: bool = Field(True, description="Persist discovered services and dependencies directly to the graph")


@router.post("/manifests", response_model=dict[str, Any])
async def ingest_manifests(
    body: ManifestIngestIn,
    ctx: WorkspaceContext = Depends(member),
) -> dict[str, Any]:
    """Ingest Kubernetes/Helm/monorepo manifests using NVIDIA Nemotron-3.5-Lightning (1M context)."""
    from app.ingest.manifest_scanner import ingest_repository_manifests
    ai_mode = ctx.workspace.get("ai_mode", "cloud")
    result = await ingest_repository_manifests(
        ws_id=ctx.ws_id,
        ai_mode=ai_mode,
        raw_manifest_text=body.manifest_content,
        org_repo=ctx.org if body.auto_persist else None,
    )
    if body.auto_persist and (result.services or result.dependencies):
        await sentinel.mark_dirty(ctx.ws_id)
        await audit(
            ctx.org,
            actor_kind="user",
            actor_id=ctx.user.id,
            action="manifest.ingested",
            target_kind="Workspace",
            target_id=ctx.ws_id,
            summary=result.summary,
        )
    return result.model_dump()

