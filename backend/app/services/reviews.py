"""Owner resolution (03 §9.2), review proposal, and review decisions with ordered idempotent effects (03 §9.1)."""

import hashlib
import json
from typing import Any

from app.auth.deps import WorkspaceContext
from app.errors import ApiError, not_found
from app.ids import DAY, new_id, now
from app.ingest.loaders import load_bundle
from app.memory.store import precedent, record_outcome
from app.models.api import Decision, ReviewDecisionIn, Role
from app.services import events, sentinel
from app.services.audit import audit

REASONS = {
    "owner_valid": "Recorded owner, still on an owning team",
    "team_lead": "Current lead of the team that owns the affected service",
    "approver": "Approved the exception originally",
    "workspace_admin": "Workspace admin (no one closer is available)",
}


async def resolve_owner(ctx: WorkspaceContext, exception_id: str) -> list[dict[str, Any]]:
    people = await ctx.org.read("exception_people", exception_id=exception_id, as_of=ctx.as_of)
    if not people:
        raise not_found("exception")
    p = people[0]
    chain: list[dict[str, Any]] = []

    def add(pid: str | None, name: str | None, code: str, kind: str = "Person") -> None:
        if pid and all(c["person"]["id"] != pid for c in chain):
            chain.append(
                {
                    "person": {"kind": kind, "id": pid, "label": name},
                    "rank": len(chain) + 1,
                    "reason_code": code,
                    "reason": REASONS[code],
                }
            )

    if p["owner_valid"]:
        add(p["owner_id"], p["owner_name"], "owner_valid")
    for lead in await ctx.org.read("owner_candidates", exception_id=exception_id, as_of=ctx.as_of):
        add(lead["person_id"], lead["name"], "team_lead")
    if p["approver_id"] and p["approver_status"] == "active":
        add(p["approver_id"], p["approver_name"], "approver")
    for a in await ctx.platform.read("p_workspace_admins", ws_id=ctx.ws_id):
        if a["person_id"]:
            add(a["person_id"], a["name"] or a["email"], "workspace_admin")
        else:
            add(a["user_id"], a["name"] or a["email"], "workspace_admin", kind="User")
    return chain


async def propose(
    ctx: WorkspaceContext, alert_id: str, exception_id: str | None, rationale: str | None, *, status: str = "pending"
) -> str:
    alert = await ctx.org.read("alert_get", id=alert_id)
    if not alert:
        raise not_found("alert")
    involved = [x["id"] for x in alert[0]["involved"] if x["id"]]
    exc_id = exception_id or (involved[0] if involved else None)
    if not exc_id or exc_id not in involved:
        raise ApiError(
            "VALIDATION_ERROR",
            "Pick an exception involved in this alert.",
            [{"field": "exception_id", "message": "Not involved in this alert"}],
        )
    assignees = await resolve_owner(ctx, exc_id)
    a = alert[0]["a"]
    review_id = new_id("rev")
    await ctx.org.write(
        "review_create",
        id=review_id,
        status=status,
        alert_id=alert_id,
        exception_id=exc_id,
        reason_code=a["rule_id"],
        rationale=rationale or a.get("summary") or a["title"],
        assignees_json=json.dumps(assignees),
        now=now(),
        assignees=[
            {"person_id": x["person"]["id"], "rank": x["rank"], "reason_code": x["reason_code"]}
            for x in assignees
            if x["person"]["kind"] == "Person"
        ],
    )
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action="review.proposed",
        target_kind="Review",
        target_id=review_id,
        summary=f"Review proposed for {exc_id}",
    )
    if status == "pending":
        await _notify_assignees(ctx, review_id, assignees, a["title"])
    await ctx.mem.write(
        "mem_handoff_done", alert_ids=[alert_id], now=now(), result=json.dumps({"review_id": review_id})
    )
    return review_id


async def _notify_assignees(ctx: WorkspaceContext, review_id: str, assignees: list[dict[str, Any]], title: str) -> None:
    primary = assignees[:1]
    person_ids = [x["person"]["id"] for x in primary if x["person"]["kind"] == "Person"]
    user_ids = [x["person"]["id"] for x in primary if x["person"]["kind"] == "User"]
    if person_ids:
        user_ids += [
            r["user_id"] for r in await ctx.platform.read("p_users_for_persons", ws_id=ctx.ws_id, person_ids=person_ids)
        ]
    if not user_ids:
        user_ids = [r["user_id"] for r in await ctx.platform.read("p_workspace_admins", ws_id=ctx.ws_id)]
    notes = [
        {
            "id": new_id("ntf"),
            "recipient_user_id": u,
            "kind": "review_assigned",
            "ref_kind": "Review",
            "ref_id": review_id,
            "title": f"Review assigned: {title}",
            "body": None,
        }
        for u in sorted(set(user_ids))
    ]
    if notes:
        await ctx.org.write("notifications_create", rows=notes, now=now())
    events.publish(ctx.ws_id, "review.assigned", {"id": review_id, "user_ids": sorted(set(user_ids))})


async def submit(ctx: WorkspaceContext, review_id: str) -> None:
    rows = await ctx.org.write(
        "review_set",
        id=review_id,
        **_review_unset(),
        status="pending",
        from_statuses=["draft"],
        version=None,
        now=now(),
        user_id=ctx.user.id,
    )
    if not rows:
        raise ApiError("INVARIANT_VIOLATION", "Only draft reviews can be submitted.")
    r = (await ctx.org.read("review_get", id=review_id))[0]
    await _notify_assignees(ctx, review_id, json.loads(r["r"]["assignees_json"]), r["alert"]["name"])


def _review_unset() -> dict[str, None]:
    return {"decision": None, "note": None}


def can_decide(ctx: WorkspaceContext, review: dict[str, Any]) -> bool:
    if ctx.at_least(Role.admin):
        return True
    assignees = json.loads(review["assignees_json"] or "[]")
    mine = {ctx.person_id, ctx.user.id} - {None}
    return ctx.at_least(Role.reviewer) and any(a["person"]["id"] in mine for a in assignees)


def successor_id(review_id: str) -> str:
    return "exc_" + hashlib.sha1(f"renewal:{review_id}".encode()).hexdigest()[:26]


async def decide(ctx: WorkspaceContext, review_id: str, body: ReviewDecisionIn, version: int | None) -> dict[str, Any]:
    rows = await ctx.org.read("review_get", id=review_id)
    if not rows:
        raise not_found("review")
    r, exc_id, alert_id = rows[0]["r"], rows[0]["exception"]["id"], rows[0]["alert"]["id"]
    if r["status"] != "pending":
        raise ApiError("INVARIANT_VIOLATION", "Only pending reviews can be decided.")
    if version is not None and r["version"] != version:
        raise ApiError("VERSION_CONFLICT", f"Review {review_id} changed since you loaded it.")
    if not can_decide(ctx, r):
        raise ApiError("FORBIDDEN", "Only the assigned reviewer or an admin can decide this review.")
    t = now()
    effects: list[str] = []
    raw = (await ctx.org.read("exception_raw", id=exc_id))[0]
    e = raw["e"]

    if body.decision == Decision.renew:
        if not body.new_expires_at or body.new_expires_at <= ctx.as_of:
            raise ApiError(
                "VALIDATION_ERROR",
                "Set a new expiry after today.",
                [{"field": "new_expires_at", "message": "Must be after the current date"}],
            )
        if e["status"] not in ("active", "renewed"):
            raise ApiError("INVARIANT_VIOLATION", "Only active exceptions can be renewed.")
        new_id_ = successor_id(review_id)
        succ = {k: e.get(k) for k in ("title", "kind", "severity", "description")}
        succ.update(
            id=new_id_,
            status="active",
            granted_at=ctx.as_of,
            expires_at=body.new_expires_at,
            control_id=raw["control_id"],
            service_ids=raw["service_ids"],
            owner_id=raw["owner_id"],
            approver_id=ctx.person_id or raw["approver_id"],
            compensating_control_ids=raw["cc_ids"],
            requester_kind="person",
        )
        await load_bundle(
            ctx.org,
            {"bundle_version": 1, "exceptions": [succ], "renewals": [{"from": new_id_, "to": exc_id}]},
            source="renewal",
            actor=ctx.user.id,
        )
        await ctx.org.write(
            "exception_set_status", id=exc_id, status="renewed", from_status=None, version=None, now=t, reason=None
        )
        effects += [f"Created {new_id_}", f"Linked renewal {new_id_} → {exc_id}", f"Marked {exc_id} renewed"]
    elif body.decision in (Decision.revoke, Decision.close):
        status = "revoked" if body.decision == Decision.revoke else "closed"
        await ctx.org.write(
            "exception_set_status", id=exc_id, status=status, from_status=None, version=None, now=t, reason=body.note
        )
        effects.append(f"Marked {exc_id} {status}")
    elif body.decision == Decision.reassign:
        if not body.new_owner_id:
            raise ApiError(
                "VALIDATION_ERROR", "Pick the new owner.", [{"field": "new_owner_id", "message": "Required"}]
            )
        if not await ctx.org.write("exception_reassign", id=exc_id, owner_id=body.new_owner_id, as_of=ctx.as_of, now=t):
            raise ApiError(
                "VALIDATION_ERROR",
                "The new owner must be an active person.",
                [{"field": "new_owner_id", "message": "Not an active person"}],
            )
        effects.append(f"Owner of {exc_id} is now {body.new_owner_id}")
    elif body.decision == Decision.defer:
        if not body.defer_until or not (ctx.as_of < body.defer_until <= ctx.as_of + 30 * DAY):
            raise ApiError(
                "VALIDATION_ERROR",
                "Defer up to 30 days.",
                [{"field": "defer_until", "message": "Must be within 30 days of today"}],
            )
        await ctx.org.write(
            "alert_set",
            **{**alert_unset(), "status": "snoozed", "snoozed_until": body.defer_until, "snooze_reason": body.note},
            id=alert_id,
            version=None,
            now=t,
        )
        effects.append(f"Snoozed {alert_id} until {body.defer_until}")

    decided = await ctx.org.write(
        "review_set",
        id=review_id,
        status="decided",
        from_statuses=["pending"],
        version=None,
        decision=body.decision.value,
        note=body.note,
        now=t,
        user_id=ctx.user.id,
    )
    if not decided:
        raise ApiError("INVARIANT_VIOLATION", "This review was already decided.")
    await record_outcome(
        ctx.mem,
        id="out_" + review_id[4:],
        review_id=review_id,
        decision=body.decision.value,
        note=body.note,
        decided_by=ctx.user.id,
        decided_at=t,
        exception_id=exc_id,
        control_id=raw["control_id"],
        service_ids=raw["service_ids"],
        renewal_depth=raw["renewal_depth"] + 1,
    )
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action=f"review.decided.{body.decision.value}",
        target_kind="Exception",
        target_id=exc_id,
        summary=body.note,
        diff={"effects": effects},
    )
    events.publish(ctx.ws_id, "review.decided", {"id": review_id, "decision": body.decision.value})
    await sentinel.mark_dirty(ctx.ws_id)
    return {"effects": effects}


def alert_unset() -> dict[str, Any]:
    return dict.fromkeys(
        (
            "status",
            "ack_by",
            "ack_at",
            "snoozed_until",
            "snooze_reason",
            "resolution",
            "resolution_note",
            "feedback",
            "feedback_note",
        )
    )


async def review_out(ctx: WorkspaceContext, review_id: str) -> dict[str, Any]:
    rows = await ctx.org.read("review_get", id=review_id)
    if not rows:
        raise not_found("review")
    row = rows[0]
    r = row["r"]
    services = row["service_ids"]
    return {
        "id": r["id"],
        "status": r["status"],
        "rationale": r.get("rationale") or "",
        "version": r["version"],
        "alert": {"kind": "Alert", "id": row["alert"]["id"], "label": row["alert"]["name"]},
        "exception": {"kind": "Exception", "id": row["exception"]["id"], "label": row["exception"]["name"]},
        "assignees": json.loads(r.get("assignees_json") or "[]"),
        "precedent": await precedent(ctx.mem, row["control_id"], services[0] if services else None),
        "decision": r.get("decision"),
        "decision_note": r.get("decision_note"),
        "decided_at": r.get("decided_at"),
        "opened_at": r["opened_at"],
    }
