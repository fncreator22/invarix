"""Exceptions, registry, graph explorer, search, reviews (03 §10.2)."""

import json
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Path, Query, status

from app.auth.deps import WorkspaceContext, admin, member, reviewer, viewer
from app.detection import algorithms
from app.errors import ApiError, not_found
from app.ids import DAY, new_id, now
from app.ingest.loaders import load_bundle
from app.models.api import EntityIn, ExceptionCreate, ExceptionOut, GraphOut, Page, ProofPath, ReviewDecisionIn, Role
from app.services import events, reviews, sentinel, views
from app.services.audit import audit

router = APIRouter(prefix="/workspaces/{ws_id}")

DOMAIN_LABELS = [
    "Service",
    "Exception",
    "Person",
    "Team",
    "Control",
    "CompensatingControl",
    "CustomerPath",
    "Runbook",
    "Evidence",
]
GRAPH_CAP = 500


def _csv(v: str | None) -> list[str] | None:
    return [x for x in v.split(",") if x] if v else None


def _version(if_match: str | None) -> int | None:
    return int(if_match.strip('"')) if if_match and if_match.strip('"').isdigit() else None


# ---------------------------------------------------------------- exceptions
@router.get("/exceptions", response_model=Page[ExceptionOut])
async def list_exceptions(
    status_: str | None = Query(None, alias="status"),
    effective_status: str | None = None,
    kind: str | None = None,
    severity: str | None = None,
    service_id: str | None = None,
    owner_id: str | None = None,
    expiring_within_days: int | None = Query(None, ge=0, le=365),
    q: str | None = Query(None, max_length=100),
    limit: int = Query(25, ge=1, le=100),
    cursor: str | None = None,
    ctx: WorkspaceContext = Depends(viewer),
) -> dict[str, Any]:
    skip = views.parse_cursor(cursor)
    sev = [int(x) for x in _csv(severity) or [] if x.isdigit()] or None
    rows = await ctx.org.read(
        "exceptions_list",
        as_of=ctx.as_of,
        window_s=views.EXPIRING_WINDOW_S,
        statuses=_csv(status_),
        effective=_csv(effective_status),
        kinds=_csv(kind),
        severities=sev,
        service_id=service_id,
        owner_id=owner_id,
        expiring_s=expiring_within_days * DAY if expiring_within_days is not None else None,
        q=q.lower() if q else None,
        skip=skip,
        limit=limit,
    )
    return {
        "items": [views.exception_out(r, ctx.as_of) for r in rows],
        "next_cursor": views.cursor(skip, limit, len(rows)),
    }


@router.get("/exceptions/{exc_id}", response_model=ExceptionOut)
async def get_exception(exc_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    return await views.get_exception(ctx, exc_id)


@router.post("/exceptions", response_model=ExceptionOut, status_code=status.HTTP_201_CREATED)
async def create_exception(body: ExceptionCreate, ctx: WorkspaceContext = Depends(member)) -> dict[str, Any]:
    errors = []
    if body.expires_at <= body.granted_at:
        errors.append({"field": "expires_at", "message": "Must be after the granted date"})
    wanted = {
        body.control_id: "Control",
        body.owner_id: "Person",
        **{s: "Service" for s in body.service_ids},
        **{c: "CompensatingControl" for c in body.compensating_control_ids},
    }
    if body.approver_id:
        wanted[body.approver_id] = "Person"
    found = {r["id"]: r["label"] for r in await ctx.org.read("hydrate_nodes", ids=list(wanted))}
    for i, label in wanted.items():
        if found.get(i) != label:
            errors.append({"field": label.lower(), "message": f"Unknown {label}: {i}"})
    owner = await ctx.org.read("entity_get", label="Person", id=body.owner_id)
    if owner and owner[0]["n"].get("status") != "active":
        errors.append({"field": "owner_id", "message": "The owner has left; pick an active person"})
    if errors:
        raise ApiError("VALIDATION_ERROR", "Some fields need attention.", errors)
    activate = body.activate and ctx.at_least(Role.reviewer)
    exc_id = new_id("exc")
    row = body.model_dump(exclude={"evidence", "activate"})
    row.update(id=exc_id, status="active" if activate else "draft", requester_kind="person")
    evidence = [
        {"id": new_id("ev"), "exception_id": exc_id, "captured_at": now(), **ev.model_dump()} for ev in body.evidence
    ]
    await load_bundle(
        ctx.org, {"bundle_version": 1, "exceptions": [row], "evidence": evidence}, source="manual", actor=ctx.user.id
    )
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action="exception.created",
        target_kind="Exception",
        target_id=exc_id,
        summary=body.title,
    )
    if activate:
        await sentinel.mark_dirty(ctx.ws_id)
    return await views.get_exception(ctx, exc_id)


@router.post("/exceptions/{exc_id}/activate", response_model=ExceptionOut)
async def activate(
    exc_id: str, if_match: str | None = Header(None), ctx: WorkspaceContext = Depends(reviewer)
) -> dict[str, Any]:
    if not await ctx.org.write(
        "exception_set_status",
        id=exc_id,
        status="active",
        from_status="draft",
        version=_version(if_match),
        now=now(),
        reason=None,
    ):
        await views.get_exception(ctx, exc_id)
        raise ApiError("INVARIANT_VIOLATION", "Only drafts can be activated (or it changed since you loaded it).")
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action="exception.activated",
        target_kind="Exception",
        target_id=exc_id,
    )
    await sentinel.mark_dirty(ctx.ws_id)
    return await views.get_exception(ctx, exc_id)


@router.get("/exceptions/{exc_id}/timeline")
async def timeline(exc_id: str, ctx: WorkspaceContext = Depends(viewer)) -> list[dict[str, Any]]:
    rows = await ctx.org.read("exception_timeline", id=exc_id)
    out = [
        {
            "at": r["at"],
            "kind": r["kind"],
            "summary": r["summary"] or "",
            "ref": {"kind": r["ref_kind"], "id": r["ref_id"]} if r["ref_id"] else None,
        }
        for r in rows
        if r["at"]
    ]
    return sorted(out, key=lambda x: x["at"], reverse=True)


# ---------------------------------------------------------------- registry
REGISTRY = {
    "services": ("Service", {"name", "tier", "customer_facing", "description"}),
    "people": ("Person", {"name", "email", "title", "role", "status"}),
    "teams": ("Team", {"name"}),
    "controls": ("Control", {"name", "framework", "severity_weight", "description"}),
    "customer-paths": ("CustomerPath", {"name", "description"}),
    "runbooks": ("Runbook", {"name", "url"}),
    "compensating-controls": (
        "CompensatingControl",
        {"description", "last_verified_at", "verified_ok", "verify_interval_days"},
    ),
}
KIND = Annotated[str, Path(pattern="^(" + "|".join(REGISTRY) + ")$")]
PREFIX = {
    "Service": "svc",
    "Person": "per",
    "Team": "team",
    "Control": "ctl",
    "CustomerPath": "cp",
    "Runbook": "rbk",
    "CompensatingControl": "cc",
}


@router.get("/services")
async def list_services(ctx: WorkspaceContext = Depends(viewer)) -> list[dict[str, Any]]:
    return [views.service_risk(r) for r in await ctx.org.read("risk_services", service_id=None)]


@router.get("/services/{service_id}")
async def get_service(service_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    rows = await ctx.org.read("service_get", id=service_id)
    if not rows:
        raise not_found("service")
    r = rows[0]
    s = {k: v for k, v in r["s"].items() if not k.startswith("risk_json")}
    return {
        **s,
        "team": views.ref("Team", r["team"]),
        "depends_on": views.refs("Service", r["depends_on"]),
        "depended_on_by": views.refs("Service", r["depended_on_by"]),
        "customer_paths": views.refs("CustomerPath", r["customer_paths"]),
    }


@router.get("/people")
async def list_people(
    q: str | None = Query(None, max_length=100), ctx: WorkspaceContext = Depends(viewer)
) -> list[dict[str, Any]]:
    rows = await ctx.org.read("people_list", as_of=ctx.as_of, q=q.lower() if q else None)
    return [{**r["p"], "teams": views.refs("Team", r["teams"]), "owned_active": r["owned_active"]} for r in rows]


@router.get("/people/{person_id}")
async def get_person(person_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    rows = await ctx.org.read("person_get", id=person_id)
    if not rows:
        raise not_found("person")
    r = rows[0]
    return {
        **r["p"],
        "memberships": [m for m in r["memberships"] if m["team_id"]],
        "leads": [m for m in r["leads"] if m["team_id"]],
        "owned": [o for o in r["owned"] if o["id"]],
        "relied_on_by": views.refs("CompensatingControl", r["relied_on_by"]),
    }


@router.get("/teams")
async def list_teams(ctx: WorkspaceContext = Depends(viewer)) -> list[dict[str, Any]]:
    rows = await ctx.org.read("teams_list", as_of=ctx.as_of)
    return [
        {
            **r["t"],
            "services": views.refs("Service", r["services"]),
            "leads": views.refs("Person", r["leads"]),
            "members": r["members"],
        }
        for r in rows
    ]


@router.get("/controls")
async def list_controls(ctx: WorkspaceContext = Depends(viewer)) -> list[dict[str, Any]]:
    return [{**r["c"], "active_waivers": r["active_waivers"]} for r in await ctx.org.read("controls_list")]


@router.post("/{kind}", status_code=201)
async def create_entity(kind: KIND, body: EntityIn, ctx: WorkspaceContext = Depends(admin)) -> dict[str, Any]:
    return await _upsert(ctx, kind, None, body)


@router.patch("/{kind}/{entity_id}")
async def update_entity(kind: KIND, entity_id: str, body: EntityIn, ctx: WorkspaceContext = Depends(admin)) -> Any:
    return await _upsert(ctx, kind, entity_id, body)


async def _upsert(ctx: WorkspaceContext, kind: str, entity_id: str | None, body: EntityIn) -> dict[str, Any]:
    if kind not in REGISTRY:
        raise not_found()
    label, allowed = REGISTRY[kind]
    data = body.model_dump()
    props = {k: v for k, v in data.items() if k in allowed | {"name"} and isinstance(v, (str, int, float, bool))}
    if label == "CompensatingControl":
        props.pop("name", None)
        props.setdefault("description", data["name"])
    if entity_id is None:
        entity_id = new_id(PREFIX[label])
    elif not await ctx.org.read("entity_get", label=label, id=entity_id):
        raise not_found(label.lower())
    row = (await ctx.org.write("entity_upsert", label=label, id=entity_id, props=props, now=now(), actor=ctx.user.id))[
        0
    ]
    if label == "Service" and isinstance(data.get("team_id"), str):
        await ctx.org.write("team_owns_set", service_id=entity_id, team_id=data["team_id"])
    if label == "Person" and isinstance(data.get("team_id"), str):
        await load_bundle(
            ctx.org,
            {
                "bundle_version": 1,
                "memberships": [
                    {"person_id": entity_id, "team_id": data["team_id"], "since": ctx.as_of, "until": None}
                ],
            },
            source="manual",
        )
    await audit(
        ctx.org,
        actor_kind="user",
        actor_id=ctx.user.id,
        action=f"{label.lower()}.saved",
        target_kind=label,
        target_id=entity_id,
        diff=props,
    )
    await sentinel.mark_dirty(ctx.ws_id)
    return row["n"]


@router.post("/services/{service_id}/dependencies", status_code=204)
async def add_dependency(service_id: str, body: dict[str, str], ctx: WorkspaceContext = Depends(admin)) -> None:
    await ctx.org.write("dependency_set", from_id=service_id, to_id=body.get("depends_on", ""))
    await sentinel.mark_dirty(ctx.ws_id)


@router.delete("/services/{service_id}/dependencies/{target_id}", status_code=204)
async def remove_dependency(service_id: str, target_id: str, ctx: WorkspaceContext = Depends(admin)) -> None:
    await ctx.org.write("dependency_delete", from_id=service_id, to_id=target_id)
    await sentinel.mark_dirty(ctx.ws_id)


# ---------------------------------------------------------------- graph
@router.get("/graph", response_model=GraphOut)
async def graph(
    focus: str | None = None,
    depth: int = Query(2, ge=1, le=3),
    kinds: str | None = None,
    ctx: WorkspaceContext = Depends(viewer),
) -> dict[str, Any]:
    labels = [k for k in (_csv(kinds) or DOMAIN_LABELS) if k in DOMAIN_LABELS]
    if focus:
        seed = await ctx.org.read("hydrate_nodes", ids=[focus])
        if not seed:
            raise not_found("node")
        nodes = {focus: {**seed[0], "severity": None, "status": None, "score": None}}
        frontier = [focus]
        for _ in range(depth):
            found = await ctx.org.read("neighbors", ids=frontier, labels=labels, limit=GRAPH_CAP)
            frontier = [n["id"] for n in found if n["id"] not in nodes]
            nodes.update({n["id"]: n for n in found})
            if len(nodes) >= GRAPH_CAP or not frontier:
                break
        items = list(nodes.values())
    else:
        items = await ctx.org.read("graph_nodes", labels=labels, limit=GRAPH_CAP + 1)
    truncated = len(items) > GRAPH_CAP
    items = items[:GRAPH_CAP]
    ids = [n["id"] for n in items]
    edges = await ctx.org.read("graph_edges_among", ids=ids)
    return {"nodes": items, "edges": edges, "truncated": truncated, "total": len(items)}


@router.get("/graph/proof-path", response_model=ProofPath)
async def proof_path(
    from_: str = Query(..., alias="from"), to: str = Query(...), ctx: WorkspaceContext = Depends(viewer)
) -> dict[str, Any]:
    rows = await ctx.org.read("proof_generic", from_id=from_, to_id=to, timeout=5000)
    if not rows:
        raise not_found("path")
    names = {r["id"]: r for r in await ctx.org.read("hydrate_nodes", ids=rows[0]["node_ids"])}
    nodes = [{"id": i, "label": names[i]["label"], "name": names[i]["name"]} for i in rows[0]["node_ids"]]
    edges = [{"from": a, "type": t, "to": b} for a, t, b in rows[0]["edges"]]
    return {
        "summary": f"{nodes[0]['name']} → {nodes[-1]['name']} in {len(edges)} steps",
        "nodes": nodes,
        "edges": edges,
    }


@router.get("/graph/clusters")
async def graph_clusters(ctx: WorkspaceContext = Depends(viewer)) -> list[dict[str, Any]]:
    return await algorithms.clusters(ctx.org)


@router.get("/search")
async def search(
    q: str = Query(..., min_length=1, max_length=100),
    kinds: str | None = None,
    limit: int = Query(10, ge=1, le=50),
    ctx: WorkspaceContext = Depends(viewer),
) -> list[dict[str, Any]]:
    labels = [k for k in (_csv(kinds) or DOMAIN_LABELS + ["Alert"]) if k in DOMAIN_LABELS + ["Alert"]]
    rows = await ctx.org.read("search", q=q.lower(), labels=labels, limit=limit)
    return [{"kind": r["label"], "id": r["id"], "label": r["name"]} for r in rows]


# ---------------------------------------------------------------- reviews
@router.get("/reviews")
async def list_reviews(
    assigned_to_me: bool = False,
    status_: str | None = Query(None, alias="status"),
    limit: int = Query(25, ge=1, le=100),
    cursor: str | None = None,
    ctx: WorkspaceContext = Depends(viewer),
) -> dict[str, Any]:
    skip = views.parse_cursor(cursor)
    if assigned_to_me and not ctx.person_id:
        return {"items": [], "next_cursor": None, "needs_identity": True}
    rows = await ctx.org.read(
        "reviews_list",
        statuses=_csv(status_),
        person_id=ctx.person_id if assigned_to_me else None,
        skip=skip,
        limit=limit,
    )
    items = [
        {
            "id": r["r"]["id"],
            "status": r["r"]["status"],
            "opened_at": r["r"]["opened_at"],
            "decision": r["r"].get("decision"),
            "decided_at": r["r"].get("decided_at"),
            "alert": views.ref("Alert", r["alert"]),
            "exception": views.ref("Exception", r["exception"]),
            "assignees": json.loads(r["r"].get("assignees_json") or "[]")[:1],
        }
        for r in rows
    ]
    return {"items": items, "next_cursor": views.cursor(skip, limit, len(rows))}


@router.get("/reviews/{review_id}")
async def get_review(review_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    out = await reviews.review_out(ctx, review_id)
    rows = await ctx.org.read("review_get", id=review_id)
    out["can_decide"] = out["status"] == "pending" and reviews.can_decide(ctx, rows[0]["r"])
    return out


@router.post("/reviews/{review_id}/submit")
async def submit_review(review_id: str, ctx: WorkspaceContext = Depends(reviewer)) -> dict[str, Any]:
    await reviews.submit(ctx, review_id)
    return await reviews.review_out(ctx, review_id)


@router.post("/reviews/{review_id}/decide")
async def decide_review(
    review_id: str,
    body: ReviewDecisionIn,
    if_match: str | None = Header(None),
    ctx: WorkspaceContext = Depends(reviewer),
) -> dict[str, Any]:
    result = await reviews.decide(ctx, review_id, body, _version(if_match))
    return {**await reviews.review_out(ctx, review_id), **result}


@router.post("/reviews/{review_id}/cancel")
async def cancel_review(review_id: str, ctx: WorkspaceContext = Depends(admin)) -> dict[str, Any]:
    if not await ctx.org.write(
        "review_set",
        id=review_id,
        status="cancelled",
        from_statuses=["draft", "pending"],
        version=None,
        decision=None,
        note=None,
        now=now(),
        user_id=ctx.user.id,
    ):
        raise ApiError("INVARIANT_VIOLATION", "Only draft or pending reviews can be cancelled.")
    events.publish(ctx.ws_id, "review.decided", {"id": review_id, "decision": "cancelled"})
    return await reviews.review_out(ctx, review_id)


READ_ONLY_KINDS = {"evidence": "Evidence"}
GET_KIND = Annotated[str, Path(pattern="^(teams|controls|customer-paths|runbooks|compensating-controls|evidence)$")]


@router.get("/{kind}/{entity_id}")
async def get_entity(kind: GET_KIND, entity_id: str, ctx: WorkspaceContext = Depends(viewer)) -> dict[str, Any]:
    label = READ_ONLY_KINDS.get(kind) or REGISTRY[kind][0]
    rows = await ctx.org.read("entity_get", label=label, id=entity_id)
    if not rows:
        raise not_found(label.lower())
    n = rows[0]["n"]
    edges = await ctx.org.read("entity_edges", id=entity_id, limit=100)
    return {
        "id": entity_id,
        "label": label,
        "name": n.get("name") or n.get("description") or entity_id,
        "props": n,
        "edges": edges,
    }
