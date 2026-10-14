"""Text ingestion (FR-REG-08, T-046): staged drafts, deterministic resolution, injection is inert (03 §12.3)."""

from pathlib import Path

import httpx
import pytest

from app.agents import llm
from app.api.system import bootstrap
from app.graph import client as graph_client
from app.ids import new_id
from app.ingest.extractor import ExtractedException, PersonHint, instruction_warnings
from app.ingest.resolver import resolve
from app.main import app
from tests.api_helpers import auth

H = auth("user_i", "i@example.com")
THREAD = (Path(__file__).resolve().parents[2] / "data/seed/threads/hostile_thread.txt").read_text()


def test_instruction_heuristic_flags_hostile_line():
    assert any("IGNORE PREVIOUS RULES" in w for w in instruction_warnings(THREAD))
    assert instruction_warnings("Please extend the cost limit for reporting by 30 days.") == []


def test_resolver_is_deterministic():
    people = [
        {"id": "per_a", "name": "Marcus Bell", "email": "m@x", "status": "active"},
        {"id": "per_b", "name": "Priya Raman", "email": "p@x", "status": "left"},
    ]
    services = [{"id": "svc_payments_gateway", "name": "payments-gateway"}]
    controls = [
        {"id": "ctl_tls_modern", "name": "Modern TLS only (1.2+)", "description": ""},
        {"id": "ctl_cost_budget", "name": "Service cost budget limits", "description": ""},
    ]
    x = ExtractedException(
        title="t",
        kind="security_waiver",
        owner_hint=PersonHint(name="Priya"),
        service_hints=["Payments Gateway"],
        control_hint="TLS 1.2",
        duration_days=45,
    )
    r = resolve(x, people, services, controls)
    assert r["service_ids"] == ["svc_payments_gateway"] and r["control_id"] == "ctl_tls_modern"
    assert r["owner_id"] is None and "owner_id" in r["unresolved"]
    x.owner_hint = PersonHint(name="marcus")
    assert resolve(x, people, services, controls)["owner_id"] == "per_a"


@pytest.fixture
async def ws(db):
    graph_client._db = None
    await bootstrap()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t/api/v1") as c:
        slug = f"in-ws-{new_id('ws')[3:12]}"
        r = await c.post(
            "/workspaces", headers=H, json={"name": "Ingest test", "slug": slug, "data_mode": "sample"}
        )
        yield c, f"/workspaces/{r.json()['id']}"
    await graph_client.close_db()


async def test_hostile_thread_stages_draft_only(ws, monkeypatch):
    c, base = ws

    async def fake_extract(ws_id, ai_mode, messages, schema, name):
        assert "<untrusted>" in messages[1]["content"]  # text is passed as quoted data
        return {
            "title": "Legacy TLS on acquirer settlement link",
            "kind": "security_waiver",
            "severity_suggested": 4,
            "owner_hint": {"name": "Priya"},
            "approver_hint": {"name": "Marcus Bell"},
            "service_hints": ["payments-gateway"],
            "control_hint": "TLS 1.2",
            "duration_days": 45,
            "evidence_excerpt": "the acquirer still can't do TLS 1.2 on the settlement link",
            "warnings": [],
        }

    monkeypatch.setattr(llm, "complete_json", fake_extract)
    active_before = len((await c.get(f"{base}/exceptions?status=active&limit=100", headers=H)).json()["items"])
    r = await c.post(f"{base}/exceptions/ingest-text", headers=H, json={"text": THREAD, "source_ref": "#payments-eng"})
    assert r.status_code == 201, r.text
    d = r.json()
    assert d["control"]["id"] == "ctl_tls_modern" and d["services"][0]["id"] == "svc_payments_gateway"
    assert d["owner"] is None and "left" in d["unresolved"]["owner_id"]
    assert any("IGNORE PREVIOUS RULES" in w for w in d["warnings"])
    active_after = len((await c.get(f"{base}/exceptions?status=active&limit=100", headers=H)).json()["items"])
    assert active_after == active_before  # nothing activated without approval

    incomplete = await c.post(f"{base}/exceptions/drafts/{d['id']}/approve", headers=H, json={})
    assert incomplete.status_code == 422 and incomplete.json()["errors"][0]["field"] == "owner_id"
    ok = await c.post(f"{base}/exceptions/drafts/{d['id']}/approve", headers=H, json={"owner_id": "per_marcus_bell"})
    assert ok.status_code == 200, ok.text
    assert ok.json()["status"] == "active" and ok.json()["owner"]["id"] == "per_marcus_bell"
    assert (await c.get(f"{base}/exceptions/drafts", headers=H)).json() == []

    r2 = (await c.post(f"{base}/exceptions/ingest-text", headers=H, json={"text": THREAD})).json()
    assert (await c.post(f"{base}/exceptions/drafts/{r2['id']}/reject", headers=H)).status_code == 204
    assert (await c.get(f"{base}/exceptions/{r2['id']}", headers=H)).status_code == 404


async def test_ingest_requires_ai(ws):
    c, base = ws
    await c.put(f"{base}/ai-settings", headers=H, json={"ai_mode": "off"})
    r = await c.post(f"{base}/exceptions/ingest-text", headers=H, json={"text": THREAD})
    assert r.status_code == 409 and r.json()["code"] == "AI_DISABLED"
