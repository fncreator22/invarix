"""Graph rows → API shapes. Shared by routers and agent tools."""

import json
from typing import Any

from app.auth.deps import WorkspaceContext
from app.errors import not_found
from app.ids import DAY

EXPIRING_WINDOW_S = 7 * DAY


def ref(kind: str, d: dict[str, Any] | None) -> dict[str, Any] | None:
    if not d or not d.get("id"):
        return None
    return {"kind": kind, "id": d["id"], "label": d.get("name")}


def refs(kind: str, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [r for r in (ref(kind, i) for i in items) if r]


def effective_status(e: dict[str, Any], as_of: int) -> str:
    if e["status"] == "active" and e["expires_at"] < as_of:
        return "expired"
    if e["status"] == "active" and e["expires_at"] <= as_of + EXPIRING_WINDOW_S:
        return "expiring"
    return str(e["status"])


def alert_out(row: dict[str, Any]) -> dict[str, Any]:
    a = row["a"]
    return {
        "id": a["id"],
        "rule_id": a["rule_id"],
        "severity": a["severity"],
        "status": a["status"],
        "title": a["title"],
        "summary": a.get("summary"),
        "score": a.get("score"),
        "subject": {
            "kind": row["subject_kind"] or a.get("subject_kind") or "Unknown",
            "id": a.get("subject_id"),
            "label": row["subject_name"],
        },
        "involved": refs("Exception", row["involved"]),
        "proof": json.loads(a["proof_json"]),
        "breakdown": json.loads(a["score_json"]) if a.get("score_json") else None,
        "created_at": a["created_at"],
        "last_seen_at": a.get("last_seen_at"),
        "snoozed_until": a.get("snoozed_until"),
        "feedback": a.get("feedback"),
        "version": a["version"],
    }


def exception_out(row: dict[str, Any], as_of: int, chain: list[str] | None = None) -> dict[str, Any]:
    e = row["e"]
    return {
        "id": e["id"],
        "title": e["title"],
        "kind": e["kind"],
        "status": e["status"],
        "effective_status": row.get("eff") or effective_status(e, as_of),
        "severity": e["severity"],
        "granted_at": e["granted_at"],
        "expires_at": e["expires_at"],
        "description": e.get("description"),
        "version": e.get("version", 1),
        "control": ref("Control", row["control"]),
        "services": refs("Service", row["services"]),
        "owner": ref("Person", row["owner"]),
        "approver": ref("Person", row.get("approver")),
        "compensating_controls": refs("CompensatingControl", row.get("ccs", [])),
        "evidence": refs("Evidence", row.get("evidence", [])),
        "renewal_chain": chain or [e["id"]],
        "open_alert_ids": row.get("alert_ids", []),
        "condition_expr": e.get("condition_expr"),
        "condition_met": e.get("condition_met"),
    }


async def get_exception(ctx: WorkspaceContext, exc_id: str) -> dict[str, Any]:
    rows = await ctx.org.read("exception_get", id=exc_id)
    if not rows:
        raise not_found("exception")
    c = (await ctx.org.read("exception_chain", id=exc_id))[0]
    olders = [i for i, _ in sorted((x for x in c["olders"] if x[0]), key=lambda x: -x[1])]
    newers = [i for i, _ in sorted((x for x in c["newers"] if x[0]), key=lambda x: x[1])]
    chain = olders + [exc_id] + newers
    return exception_out(rows[0], ctx.as_of, chain)


async def get_alert(ctx: WorkspaceContext, alert_id: str) -> dict[str, Any]:
    rows = await ctx.org.read("alert_get", id=alert_id)
    if not rows:
        raise not_found("alert")
    return alert_out(rows[0])


def service_risk(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "service": {"kind": "Service", "id": r["id"], "label": r["name"]},
        "tier": r["tier"],
        "customer_facing": bool(r["customer_facing"]),
        "team": {"kind": "Team", "id": r["team_id"], "label": r["team_name"]} if r["team_id"] else None,
        "score": r["score"],
        "band": r["band"],
        "rule_hits": r["rule_hits"],
        "active_exceptions": r["active_exceptions"],
    }


def cursor(skip: int, limit: int, got: int) -> str | None:
    return str(skip + limit) if got == limit else None


def parse_cursor(c: str | None) -> int:
    return int(c) if c and c.isdigit() else 0
