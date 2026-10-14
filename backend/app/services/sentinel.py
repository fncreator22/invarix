"""Sentinel run (03 §8.5): lock → detect → persist alerts → resolve cleared → snapshots → run record → events."""

import asyncio
import json
import time
from collections import defaultdict
from typing import Any

import structlog

from app.detection.config import load_config
from app.detection.engine import alert_params, run_rules
from app.graph.client import get_db, graph_names, platform_graph
from app.graph.repo import Repo
from app.ids import DAY, new_id, now
from app.prediction.engine import run_prediction_simulation
from app.services import events

log = structlog.get_logger()
LOCK_S = 120
DEBOUNCE_S = 5.0


async def run(ws_id: str, trigger: str) -> dict[str, Any] | None:
    db = get_db()
    platform = Repo(db, platform_graph())
    t = now()
    if not await platform.write("p_sentinel_lock", ws_id=ws_id, now=t, until=t + LOCK_S):
        return None
    names = graph_names(ws_id)
    org = Repo(db, names.org)
    started = time.monotonic()
    result: dict[str, Any] = {"created": 0, "updated": 0, "resolved": 0}
    error = None
    try:
        w = (await platform.read("p_workspace_get", ws_id=ws_id))[0]["w"]
        as_of = int(w["as_of"]) if w.get("clock_mode") == "simulated" else t
        events.publish(ws_id, "sentinel.started", {"trigger": trigger, "as_of": as_of})
        result = await _detect_and_persist(ws_id, org, platform, as_of, t)
        result["as_of"] = as_of
    except Exception as ex:
        error = str(ex)
        log.exception("sentinel_failed", ws_id=ws_id)
        as_of = t
    finally:
        await platform.write("p_sentinel_unlock", ws_id=ws_id, now=now())
    duration = int((time.monotonic() - started) * 1000)
    await org.write(
        "sentinel_run_write",
        id=new_id("run"),
        trigger=trigger,
        as_of=as_of,
        started_at=t,
        finished_at=now(),
        rules_run=result.get("rules", 0),
        alerts_created=result["created"],
        alerts_updated=result["updated"],
        alerts_resolved=result["resolved"],
        duration_ms=duration,
        error=error,
    )
    events.publish(
        ws_id,
        "sentinel.finished",
        {**result, "duration_ms": duration, "error": error, "ok": error is None, "alerts_created": result["created"]},
    )
    return result


async def _detect_and_persist(ws_id: str, org: Repo, platform: Repo, as_of: int, t: int) -> dict[str, Any]:
    cfg = await load_config(org)
    res = await run_rules(org, cfg, as_of)
    rows = [alert_params(f, now=t, as_of=as_of) for f in res.findings]
    upserted = []
    for i in range(0, len(rows), 200):
        upserted += await org.write("alert_upsert", rows=rows[i : i + 200], now=t, as_of=as_of)
    await org.write_batched(
        "alert_link_involved", [{"id": f.alert_id, "exception_ids": f.involved} for f in res.findings]
    )
    by_label: dict[str, list[dict[str, str]]] = defaultdict(list)
    for f in res.findings:
        by_label[f.subject_kind].append({"id": f.alert_id, "subject_id": f.subject_id})
    for label, link_rows in by_label.items():
        await org.write_batched("alert_link_about", link_rows, label=label)
    resolved = await org.write(
        "alert_resolve_cleared",
        now=t,
        active_ids=[f.alert_id for f in res.findings],
        evaluated_rule_ids=res.evaluated_rules,
    )

    await org.write_batched(
        "service_scores_set",
        [
            {
                "id": s,
                "score": sc["score"],
                "band": sc["band"],
                "rule_hits": sc["rule_hits"],
                "score_json": json.dumps(sc),
            }
            for s, sc in res.scores.items()
        ],
        as_of=as_of,
    )
    last = {r["service_id"]: r for r in await org.read("snapshots_latest")}
    snaps = [
        {
            "id": new_id("snp"),
            "service_id": s,
            "score": sc["score"],
            "band": sc["band"],
            "raw": sc["raw"],
            "breakdown_json": json.dumps(sc),
        }
        for s, sc in res.scores.items()
        if s not in last or abs(last[s]["score"] - sc["score"]) >= 1 or last[s]["as_of"] // DAY != as_of // DAY
    ]
    if snaps:
        await org.write_batched("snapshots_write", snaps, as_of=as_of)

    created = [u for u in upserted if u["created"]]
    urgent = [u for u in created if u["severity"] in ("high", "critical")]
    if urgent:
        rule_of = {f.alert_id: f.rule_id for f in res.findings}
        await Repo(org.db, graph_names(ws_id).mem).write(
            "mem_handoff_upsert",
            now=t,
            rows=[
                {
                    "id": "hnd_" + u["id"][4:],
                    "alert_id": u["id"],
                    "title": u["title"],
                    "kind": "owner_unresolved" if rule_of.get(u["id"]) == "R2" else "review_suggested",
                    "priority": 1 if u["severity"] == "critical" else 2,
                }
                for u in urgent
            ],
        )
    if resolved:
        await Repo(org.db, graph_names(ws_id).mem).write(
            "mem_handoff_done", alert_ids=[r["id"] for r in resolved], now=t, result='{"resolution": "auto_cleared"}'
        )
    for u in created:
        events.publish(ws_id, "alert.created", {"id": u["id"], "severity": u["severity"], "title": u["title"]})
    for r in resolved:
        events.publish(ws_id, "alert.resolved", {"id": r["id"]})
    critical = [u for u in created if u["severity"] == "critical"]
    if critical:
        admins = await platform.read("p_workspace_admins", ws_id=ws_id)
        notes = [
            {
                "id": new_id("ntf"),
                "recipient_user_id": a["user_id"],
                "kind": "critical_alert",
                "ref_kind": "Alert",
                "ref_id": u["id"],
                "title": u["title"],
                "body": "New critical alert",
            }
            for u in critical
            for a in admins
        ]
        await org.write_batched("notifications_create", notes, now=t)
        for n in notes:
            events.publish(ws_id, "notification.created", {"id": n["id"], "recipient_user_id": n["recipient_user_id"]})

    try:
        forecast = await run_prediction_simulation(org, as_of=as_of, horizon_days=30)
        deco_rows = [
            {
                "service_id": sid,
                "simulated_score": d.simulated_score,
                "risk_band": d.risk_band,
                "is_spof": d.is_spof,
                "has_collision": d.has_collision,
                "pulse": d.pulse,
                "color": d.color,
            }
            for sid, d in forecast.canvas_decorations.items()
        ]
        if deco_rows:
            await org.write_batched("prediction_cache_set", deco_rows, as_of=as_of)
        log.info("prediction_cached", ws_id=ws_id, services=len(deco_rows))
    except Exception:
        log.warning("prediction_cache_failed", ws_id=ws_id)

    return {
        "created": len(created),
        "updated": len(upserted) - len(created),
        "resolved": len(resolved),
        "rules": len(res.evaluated_rules),
        "alerts": len(res.findings),
    }


WORKSPACE_FIELDS = (
    "status",
    "clock_mode",
    "as_of",
    "ai_mode",
    "onboarding_step",
    "onboarding_done",
    "dirty",
    "last_sentinel_at",
    "name",
    "data_mode",
    "integrations_json",
)


def _unset() -> dict[str, Any]:
    return dict.fromkeys(WORKSPACE_FIELDS)


_pending: dict[str, asyncio.Task[None]] = {}


async def mark_dirty(ws_id: str, trigger: str = "change") -> None:
    await Repo(get_db(), platform_graph()).write("p_workspace_set", **{**_unset(), "dirty": True}, ws_id=ws_id)
    task = _pending.get(ws_id)
    if task and not task.done():
        task.cancel()

    async def later() -> None:
        await asyncio.sleep(DEBOUNCE_S)
        _pending.pop(ws_id, None)
        await run(ws_id, trigger)

    _pending[ws_id] = asyncio.get_running_loop().create_task(later())
