"""Steward contract: tool loop, citations, groundedness removal, persistence, quick answers (FR-STW-02/06/10)."""

import json

import httpx
import pytest

from app.agents import llm
from app.agents.guard import ground
from app.api.system import bootstrap
from app.graph import client as graph_client
from app.ids import new_id
from app.main import app
from tests.api_helpers import auth

H = auth("user_s", "s@example.com")


def test_ground_removes_unknown_ids():
    md = "Checkout is riskiest `svc_checkout_api`. It also touches `svc_made_up`. Plain sentence."
    clean, cites, removed = ground(md, {"svc_checkout_api": "checkout-api"})
    assert removed == 1 and "svc_made_up" not in clean and "Plain sentence." in clean
    assert cites == [{"kind": "Service", "id": "svc_checkout_api", "label": "checkout-api"}]


def sse(text: str) -> list[tuple[str, dict]]:
    out, event = [], None
    for line in text.splitlines():
        if line.startswith("event:"):
            event = line[6:].strip()
        elif line.startswith("data:") and event:
            out.append((event, json.loads(line[5:].strip())))
    return out


@pytest.fixture
async def ws(db):
    graph_client._db = None
    await bootstrap()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t/api/v1") as c:
        slug = f"st-ws-{new_id('ws')[3:12]}"
        r = await c.post(
            "/workspaces", headers=H, json={"name": "Steward test", "slug": slug, "data_mode": "sample"}
        )
        yield c, f"/workspaces/{r.json()['id']}"
    await graph_client.close_db()


async def test_steward_turn_with_stub_llm(ws, monkeypatch):
    c, base = ws
    script = [
        llm.LLMEvent("done", tool_calls=[llm.ToolCall("c1", "list_risk_services", '{"limit": 3}')], model="stub"),
        llm.LLMEvent(
            "done",
            text="Checkout carries the most hidden risk `svc_checkout_api`. Also see `svc_imaginary` for more.",
            model="stub",
            usage={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        ),
    ]

    async def fake(ws_id, ai_mode, messages, tools):
        ev = script.pop(0)
        if ev.text:
            yield llm.LLMEvent("token", text=ev.text)
        yield ev

    monkeypatch.setattr(llm, "stream_chat", fake)
    ses = (await c.post(f"{base}/chat/sessions", headers=H)).json()
    r = await c.post(
        f"{base}/chat/sessions/{ses['id']}/messages",
        headers=H,
        json={"content": "Which service carries the most hidden risk?"},
    )
    events = sse(r.text)
    kinds = [e for e, _ in events]
    assert kinds[0] == "run.started" and "tool.call" in kinds and "tool.result" in kinds and kinds[-1] == "done"
    final = next(d for e, d in events if e == "final")
    assert final["removed_claims"] == 1 and "svc_imaginary" not in final["answer_markdown"]
    assert [x["id"] for x in final["citations"]] == ["svc_checkout_api"]
    assert final["used_tools"] == ["list_risk_services"]
    turns = (await c.get(f"{base}/chat/sessions/{ses['id']}", headers=H)).json()["turns"]
    assert [t["role"] for t in turns] == ["user", "assistant"] and turns[1]["citations"][0]["id"] == "svc_checkout_api"


async def test_quick_answers_and_ai_off(ws):
    c, base = ws
    top = (await c.post(f"{base}/chat/quick", headers=H, json={"kind": "top_risk"})).json()
    assert top["citations"] and top["removed_claims"] == 0 and top["proof_paths"]
    own = (
        await c.post(f"{base}/chat/quick", headers=H, json={"kind": "owner", "exception_id": "exc_ghost_vault_key"})
    ).json()
    assert any(x["id"] == "per_marcus_bell" for x in own["citations"])
    await c.put(f"{base}/ai-settings", headers=H, json={"ai_mode": "off"})
    ses = (await c.post(f"{base}/chat/sessions", headers=H)).json()
    r = await c.post(f"{base}/chat/sessions/{ses['id']}/messages", headers=H, json={"content": "hi"})
    assert r.status_code == 409 and r.json()["code"] == "AI_DISABLED"


async def test_proposed_action_needs_approval(ws, monkeypatch):
    c, base = ws
    alerts = (await c.get(f"{base}/alerts?rule=R2", headers=H)).json()["items"]
    script = [
        llm.LLMEvent(
            "done", tool_calls=[llm.ToolCall("c1", "propose_review", json.dumps({"alert_id": alerts[0]["id"]}))]
        ),
        llm.LLMEvent("done", text="I drafted a review; approve it to open it."),
    ]

    async def fake(ws_id, ai_mode, messages, tools):
        yield script.pop(0)

    monkeypatch.setattr(llm, "stream_chat", fake)
    ses = (await c.post(f"{base}/chat/sessions", headers=H)).json()
    events = sse(
        (
            await c.post(
                f"{base}/chat/sessions/{ses['id']}/messages",
                headers=H,
                json={"content": "Open a review for the ghost owner"},
            )
        ).text
    )
    action = next(d for e, d in events if e == "proposed_action")
    before = (await c.get(f"{base}/reviews", headers=H)).json()["items"]
    assert before == []  # nothing changes until a human approves
    ok = (await c.post(f"{base}/chat/actions/{action['action_id']}/approve", headers=H)).json()
    assert ok["review"]["status"] == "pending"
    again = await c.post(f"{base}/chat/actions/{action['action_id']}/approve", headers=H)
    assert again.status_code == 404


async def test_alert_explain_fallback_and_cached_ai(ws, monkeypatch):
    c, base = ws
    alert = (await c.get(f"{base}/alerts?rule=R2", headers=H)).json()["items"][0]
    calls = []

    async def fake(ws_id, ai_mode, messages, schema, name):
        calls.append(name)
        return {"text": f"Owner left, so route it to the lead `{alert['subject']['id']}`. Also `svc_fake` matters."}

    monkeypatch.setattr(llm, "complete_json", fake)
    ai = (await c.get(f"{base}/alerts/{alert['id']}/explain", headers=H)).json()
    assert ai["source"] == "ai" and "svc_fake" not in ai["text"] and ai["citations"]
    again = (await c.get(f"{base}/alerts/{alert['id']}/explain", headers=H)).json()
    assert again == ai and calls == ["alert_summary"]  # cached for this alert version
    await c.put(f"{base}/ai-settings", headers=H, json={"ai_mode": "off"})
    off = (await c.get(f"{base}/alerts/{alert['id']}/explain", headers=H)).json()
    assert off["source"] == "deterministic" and "Path:" in off["text"]


async def test_recall_conversation_history_tool_and_isolation(ws, monkeypatch):
    c, base = ws
    script = [
        llm.LLMEvent("done", tool_calls=[llm.ToolCall("c1", "list_risk_services", '{"limit": 3}')], model="stub"),
        llm.LLMEvent(
            "done",
            text="Checkout carries the most hidden risk `svc_checkout_api`.",
            model="stub",
            usage={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        ),
    ]

    async def fake(ws_id, ai_mode, messages, tools):
        ev = script.pop(0)
        yield ev

    monkeypatch.setattr(llm, "stream_chat", fake)
    ses = (await c.post(f"{base}/chat/sessions", headers=H)).json()
    r = await c.post(
        f"{base}/chat/sessions/{ses['id']}/messages",
        headers=H,
        json={"content": "Do you remember what we talked about day before today?"},
    )
    _ = r.text  # fully consume the SSE stream so turns are written

    from app.agents.tools import execute, HistorySearchArgs, recall_conversation_history
    from app.auth.deps import CurrentUser, WorkspaceContext
    from app.graph.client import get_db, graph_names
    from app.graph.repo import Repo
    from app.models.api import Role

    ws_id = base.split("/")[-1]
    db = get_db()
    names = graph_names(ws_id)
    real_user_id = ses["user_id"]
    ctx_user1 = WorkspaceContext(
        ws_id=ws_id,
        workspace={"id": ws_id, "data_mode": "sample", "clock_mode": "simulated"},
        role=Role.admin,
        person_id=None,
        as_of=1700000000,
        user=CurrentUser(id=real_user_id, clerk_user_id="user_s", email="s@example.com", name="S", prefs={}),
        platform=Repo(db, names.platform),
        org=Repo(db, names.org),
        mem=Repo(db, names.mem),
    )

    # User 1 searches past conversation
    res1 = await execute(ctx_user1, "recall_conversation_history", '{"query": "hidden risk"}')
    assert res1.data["conversations"]
    assert any("hidden risk" in c["content"] for c in res1.data["conversations"])

    # User 1 searches with empty query (retrieves recent turns)
    res_all = await execute(ctx_user1, "recall_conversation_history", '{"query": ""}')
    assert len(res_all.data["conversations"]) >= 1

    # User 1 searches non-matching query
    res_none = await execute(ctx_user1, "recall_conversation_history", '{"query": "nonexistent query"}')
    assert res_none.data["conversations"] == []

    # User 2 in the same workspace has isolated memory - cannot see User 1's history
    ctx_user2 = WorkspaceContext(
        ws_id=ws_id,
        workspace={"id": ws_id, "data_mode": "sample", "clock_mode": "simulated"},
        role=Role.member,
        person_id=None,
        as_of=1700000000,
        user=CurrentUser(id="user_other", clerk_user_id="user_other", email="other@example.com", name="Other", prefs={}),
        platform=Repo(db, names.platform),
        org=Repo(db, names.org),
        mem=Repo(db, names.mem),
    )
    res2 = await execute(ctx_user2, "recall_conversation_history", '{"query": "hidden risk"}')
    assert res2.data["conversations"] == []


async def test_gdpr_purge_data_endpoint(ws):
    c, base = ws
    res = await c.post(f"{base}/purge-data", headers=H)
    assert res.status_code == 200
    data = res.json()
    assert data["data_mode"] == "blank"
    assert data["status"] in ("provisioning", "ready")
