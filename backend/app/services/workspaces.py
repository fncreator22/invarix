"""Workspace lifecycle: create, provision (sample/blank), clock, AI mode, onboarding (03 §6.5)."""

from typing import Any

import structlog

from app.config import get_settings
from app.detection.config import default_rule_rows
from app.errors import ApiError
from app.graph.client import get_db, graph_names
from app.graph.repo import Repo
from app.graph.schema import MEM, ORG, SCHEMA_VERSION, ensure_schema
from app.ids import new_id, now
from app.ingest.loaders import load_bundle, read_bundle
from app.memory.store import seed_playbooks
from app.services import events, sentinel
from app.services.sentinel import _unset

log = structlog.get_logger()


async def set_fields(platform: Repo, ws_id: str, **fields: Any) -> dict[str, Any]:
    rows = await platform.write("p_workspace_set", **{**_unset(), **fields}, ws_id=ws_id)
    return rows[0]["w"] if rows else {}


async def create(platform: Repo, user_id: str, name: str, slug: str, data_mode: str) -> str:
    if (await platform.read("p_slug_taken", slug=slug))[0]["n"]:
        raise ApiError(
            "VALIDATION_ERROR", "That workspace URL is taken.", [{"field": "slug", "message": "Already taken"}]
        )
    ws_id = new_id("ws")
    simulated = data_mode == "sample"
    created = await platform.write(
        "p_workspace_create",
        id=ws_id,
        slug=slug,
        name=name,
        data_mode=data_mode,
        clock_mode="simulated" if simulated else "live",
        as_of=get_settings().as_of_default if simulated else now(),
        user_id=user_id,
        now=now(),
        schema_version=SCHEMA_VERSION,
    )
    if not created:  # user mirror missing (platform graph restored); client retries after re-auth
        raise ApiError("UNAUTHENTICATED", "Your account record was refreshed. Try again.")
    return ws_id


async def provision(platform: Repo, ws_id: str, data_mode: str) -> None:
    """Idempotent: safe to re-run for rehydrate (drops and rebuilds both graphs)."""
    db = get_db()
    names = graph_names(ws_id)
    org, mem = Repo(db, names.org), Repo(db, names.mem)
    step = lambda s: events.publish(ws_id, "workspace.provisioning", {"step": s})  # noqa: E731
    try:
        await set_fields(platform, ws_id, status="provisioning")
        step("creating_graph")
        await org.drop()
        await mem.drop()
        await ensure_schema(org, ORG)
        await ensure_schema(mem, MEM)
        await org.write("schema_meta_upsert", version=SCHEMA_VERSION, now=now())
        await org.write("rule_config_upsert", rows=default_rule_rows(), now=now())
        await seed_playbooks(mem)
        if data_mode == "sample":
            step("loading_sample")
            await load_bundle(org, read_bundle(), source="sample")
        step("running_sentinel")
        await sentinel.run(ws_id, "manual")
        step("ranking_risk")
        await set_fields(platform, ws_id, status="ready")
        events.publish(ws_id, "workspace.provisioning", {"step": "ready"})
    except Exception:
        log.exception("provision_failed", ws_id=ws_id)
        await set_fields(platform, ws_id, status="failed")
        events.publish(ws_id, "workspace.provisioning", {"step": "failed"})


async def delete(platform: Repo, ws_id: str) -> None:
    """Permanently delete a workspace: drops domain and memory graphs, deletes platform records & API keys."""
    db = get_db()
    names = graph_names(ws_id)
    org, mem = Repo(db, names.org), Repo(db, names.mem)
    try:
        await org.drop()
    except Exception:
        log.warning("failed_to_drop_org_graph", ws_id=ws_id)
    try:
        await mem.drop()
    except Exception:
        log.warning("failed_to_drop_mem_graph", ws_id=ws_id)
    await platform.write("p_workspace_delete", ws_id=ws_id)
    events.publish(ws_id, "workspace.deleted", {"workspace_id": ws_id})
