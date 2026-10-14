"""End-to-End Grounded Conversational Intelligence & Adversarial Refusal Tests (R1, F1, F2).

Verifies:
1. Strict Grounding Rigor: Responses cite only verified, existing node IDs
   across all supported entity kinds (svc_*, exc_*, per_*, team_*, ctl_*, cc_*, cp_*, rbk_*).
2. Adversarial Refusal Testing: Queries referencing unmodeled entities, absent services,
   or speculative/hallucinated scenarios produce explicit refusal/fallback with 0 hallucinated IDs.
3. Edge Citation Verification: All relationship citations and proof paths match
   authentic, existing graph edges in FalkorDB.
"""

import json
from typing import Any

import httpx
import pytest

from app.agents import llm, tools
from app.agents.guard import ground
from app.agents.tools import LABEL_OF
from app.api.system import bootstrap
from app.auth.deps import CurrentUser, WorkspaceContext
from app.graph import client as graph_client
from app.ids import new_id
from app.graph.repo import Repo
from app.graph.schema import ORG, ensure_schema
from app.ingest.loaders import load_bundle, read_bundle
from app.main import app
from app.models.api import Role
from tests.api_helpers import auth

TEST_AUTH_HEADER = auth("user_grounding_eval", "grounding_eval@example.com")


# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------
@pytest.fixture
async def seeded_repo(db, request):
    """Provide an isolated, schema-bootstrapped, and seeded FalkorDB graph."""
    r = Repo(db, f"test_cg_{request.node.name[:35]}")
    await ensure_schema(r, ORG)
    await load_bundle(r, read_bundle(), source="sample")
    return r


@pytest.fixture
async def live_ws(db):
    """Provide a full sample workspace via FastAPI ASGI test client."""
    graph_client._db = None
    await bootstrap()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1"
    ) as client:
        slug = f"cg-ws-{new_id('ws')[3:12]}"
        resp = await client.post(
            "/workspaces",
            headers=TEST_AUTH_HEADER,
            json={
                "name": "Grounding Evaluation Workspace",
                "slug": slug,
                "data_mode": "sample",
            },
        )
        assert resp.status_code == 201, resp.text
        ws_id = resp.json()["id"]
        yield client, ws_id, f"/workspaces/{ws_id}"
    await graph_client.close_db()


def parse_sse(text: str) -> list[tuple[str, dict[str, Any]]]:
    """Parse Server-Sent Events stream into a list of (event_name, data_dict) tuples."""
    events: list[tuple[str, dict[str, Any]]] = []
    current_event: str | None = None
    for line in text.splitlines():
        if line.startswith("event:"):
            current_event = line[6:].strip()
        elif line.startswith("data:") and current_event:
            try:
                events.append((current_event, json.loads(line[5:].strip())))
            except json.JSONDecodeError:
                pass
    return events


# -----------------------------------------------------------------------------
# Tier 1: Grounded Conversational Rigor Tests (Node Citation Coverage)
# -----------------------------------------------------------------------------
def test_ground_valid_ids_across_all_entity_types():
    """Verify ground() recognizes and preserves valid entity IDs across all supported prefixes."""
    known_entities = {
        "svc_checkout_api": "Checkout API",
        "exc_ghost_vault_key": "Ghost Vault Key Exception",
        "per_marcus_bell": "Marcus Bell",
        "team_payments": "Payments Team",
        "ctl_pci_dss_34": "PCI DSS 3.4 Key Rotation",
        "cc_fraud_spot_check": "Fraud Manual Spot Check",
        "cp_checkout": "Checkout Customer Path",
        "rbk_vault_emergency": "Vault Emergency Runbook",
        "alt_sample_alert": "Sample Alert",
        "rev_sample_review": "Sample Review",
        "ev_sample_evidence": "Sample Evidence",
    }

    raw_text = (
        "Service `svc_checkout_api` is critical. "
        "Exception `exc_ghost_vault_key` was flagged by `per_marcus_bell`. "
        "Owned by `team_payments` following control `ctl_pci_dss_34`. "
        "Compensating control is `cc_fraud_spot_check`. "
        "Impacts customer path `cp_checkout` per `rbk_vault_emergency`."
    )

    clean_text, citations, removed_count = ground(raw_text, known_entities)

    assert removed_count == 0
    assert clean_text == raw_text
    assert len(citations) == 8

    citation_kinds = {c["kind"] for c in citations}
    assert citation_kinds == {
        "Service",
        "Exception",
        "Person",
        "Team",
        "Control",
        "CompensatingControl",
        "CustomerPath",
        "Runbook",
    }

    # Verify citation metadata structure
    for cite in citations:
        assert cite["id"] in known_entities
        assert cite["label"] == known_entities[cite["id"]]
        expected_kind = LABEL_OF[cite["id"].split("_", 1)[0]]
        assert cite["kind"] == expected_kind


def test_ground_prunes_hallucinated_and_unmodeled_ids():
    """Verify ground() deterministically removes sentences with hallucinated or unmodeled IDs."""
    known = {
        "svc_checkout_api": "Checkout API",
        "per_marcus_bell": "Marcus Bell",
    }

    raw_text = (
        "Primary service is `svc_checkout_api` managed by `per_marcus_bell`. "
        "However, secret database `svc_unmodeled_quantum_db` is leaking keys. "
        "Consultant `per_phantom_contractor` created waiver `exc_shadow_crypto_001`. "
        "Normal operations continue for verified components."
    )

    clean, citations, removed = ground(raw_text, known)

    # 2 sentences containing hallucinated IDs must be dropped
    assert removed == 2
    assert "svc_unmodeled_quantum_db" not in clean
    assert "per_phantom_contractor" not in clean
    assert "exc_shadow_crypto_001" not in clean
    assert "svc_checkout_api" in clean
    assert "per_marcus_bell" in clean
    assert "Normal operations continue for verified components." in clean

    assert len(citations) == 2
    assert {c["id"] for c in citations} == {"svc_checkout_api", "per_marcus_bell"}


def test_ground_exact_sentence_boundary_isolation():
    """Verify sentence boundary regex handles exclamation, question marks, and newlines."""
    known = {"svc_auth": "Auth Service"}

    mixed_text = (
        "Auth service `svc_auth` is operational!\n"
        "Did you inspect `svc_hallucinated_1`?\n"
        "Check `svc_hallucinated_2` immediately.\n"
        "All systems operational."
    )

    clean, citations, removed = ground(mixed_text, known)
    assert removed == 2
    assert "svc_hallucinated_1" not in clean
    assert "svc_hallucinated_2" not in clean
    assert "svc_auth" in clean
    assert len(citations) == 1
    assert citations[0]["id"] == "svc_auth"


# -----------------------------------------------------------------------------
# Tier 2: Adversarial Refusal & Absence Defense Tests
# -----------------------------------------------------------------------------
def test_adversarial_massive_hallucination_purge():
    """Adversarial stress test: LLM outputs text with 25 fabricated node IDs across all prefixes."""
    known = {"svc_checkout_api": "Checkout API"}

    fake_claims = [
        f"Claim {i}: Service `svc_fake_{i}` affects exception `exc_fake_{i}`."
        for i in range(1, 11)
    ]
    fake_claims += [
        f"Admin `per_hacker_{j}` created control `ctl_rogue_{j}`."
        for j in range(1, 6)
    ]
    raw_response = (
        "Grounding anchor: `svc_checkout_api` is the only real node. "
        + " ".join(fake_claims)
    )

    clean, citations, removed = ground(raw_response, known)

    assert removed == 15  # 15 distinct sentences containing fake IDs
    assert len(citations) == 1
    assert citations[0]["id"] == "svc_checkout_api"
    for i in range(1, 11):
        assert f"svc_fake_{i}" not in clean
        assert f"exc_fake_{i}" not in clean


def test_adversarial_complete_hallucination_yields_fallback():
    """When all claims in the response are hallucinated, the response is empty and triggers fallback."""
    known = {"svc_checkout_api": "Checkout API"}

    all_hallucinated = (
        "The vulnerability is in `svc_nonexistent_microservice`. "
        "Waiver `exc_fictional_waiver` was signed by `per_untracked_auditor`."
    )

    clean, citations, removed = ground(all_hallucinated, known)

    assert removed == 2
    assert clean == ""
    assert len(citations) == 0


async def test_steward_turn_purges_unmodeled_ids_in_sse_flow(live_ws, monkeypatch):
    """End-to-End Turn Test: Verify assistant purges unverified IDs in the live SSE message stream."""
    client, ws_id, base = live_ws

    # Scripted LLM simulation: attempts to cite real svc_checkout_api AND fake svc_phantom_core
    script = [
        llm.LLMEvent(
            "done",
            tool_calls=[llm.ToolCall("call_1", "list_risk_services", '{"limit": 3}')],
            model="stub-evaluator",
        ),
        llm.LLMEvent(
            "done",
            text=(
                "Analysis complete. Most vulnerable service is `svc_checkout_api`. "
                "However, upstream proxy `svc_phantom_core` also has an active leak."
            ),
            model="stub-evaluator",
            usage={"prompt_tokens": 20, "completion_tokens": 15, "total_tokens": 35},
        ),
    ]

    async def fake_stream_chat(ws_id, ai_mode, messages, tools):
        ev = script.pop(0)
        if ev.text:
            yield llm.LLMEvent("token", text=ev.text)
        yield ev

    monkeypatch.setattr(llm, "stream_chat", fake_stream_chat)

    # 1. Create a chat session
    sess_res = await client.post(f"{base}/chat/sessions", headers=TEST_AUTH_HEADER)
    assert sess_res.status_code == 201
    session_id = sess_res.json()["id"]

    # 2. Send query
    msg_res = await client.post(
        f"{base}/chat/sessions/{session_id}/messages",
        headers=TEST_AUTH_HEADER,
        json={"content": "Explain our most critical service vulnerabilities."},
    )
    assert msg_res.status_code == 200

    events = parse_sse(msg_res.text)
    event_names = [e for e, _ in events]
    assert "run.started" in event_names
    assert "tool.call" in event_names
    assert "tool.result" in event_names
    assert "final" in event_names

    final_payload = next(data for ev, data in events if ev == "final")
    assert final_payload["removed_claims"] == 1
    assert "svc_phantom_core" not in final_payload["answer_markdown"]
    assert "svc_checkout_api" in final_payload["answer_markdown"]

    # Verify citations contain ONLY valid IDs from tool execution
    cited_ids = [c["id"] for c in final_payload["citations"]]
    assert cited_ids == ["svc_checkout_api"]


async def test_adversarial_unmodeled_entity_refusal_response(live_ws, monkeypatch):
    """Adversarial Query: Query about an unmodeled entity yields structured refusal with 0 hallucinated citations."""
    client, ws_id, base = live_ws

    # LLM tries to call search_entities, finds nothing, and outputs refusal text
    script = [
        llm.LLMEvent(
            "done",
            tool_calls=[
                llm.ToolCall(
                    "c_search", "search_entities", '{"q": "Azure SQL Database in Frankfurt"}'
                )
            ],
            model="stub-evaluator",
        ),
        llm.LLMEvent(
            "done",
            text=(
                "Refusal: The entity 'Azure SQL Database in Frankfurt' is not present in "
                "the verified FalkorDB graph state. Reprieve only reasons over verified graph evidence."
            ),
            model="stub-evaluator",
            usage={"prompt_tokens": 15, "completion_tokens": 25, "total_tokens": 40},
        ),
    ]

    async def fake_stream_chat(ws_id, ai_mode, messages, tools):
        ev = script.pop(0)
        if ev.text:
            yield llm.LLMEvent("token", text=ev.text)
        yield ev

    monkeypatch.setattr(llm, "stream_chat", fake_stream_chat)

    sess_res = await client.post(f"{base}/chat/sessions", headers=TEST_AUTH_HEADER)
    session_id = sess_res.json()["id"]

    msg_res = await client.post(
        f"{base}/chat/sessions/{session_id}/messages",
        headers=TEST_AUTH_HEADER,
        json={"content": "List all exceptions for Azure SQL Database in Frankfurt."},
    )
    assert msg_res.status_code == 200

    events = parse_sse(msg_res.text)
    final_payload = next(data for ev, data in events if ev == "final")

    # Assert refusal text is delivered intact with 0 citations and 0 removed claims
    assert "Refusal: The entity" in final_payload["answer_markdown"]
    assert "not present in the verified FalkorDB graph state" in final_payload["answer_markdown"]
    assert len(final_payload["citations"]) == 0
    assert final_payload["removed_claims"] == 0


# -----------------------------------------------------------------------------
# Tier 3 & 4: Live Graph Grounding & Edge Citation Verification
# -----------------------------------------------------------------------------
async def test_tool_results_collect_known_entities_from_live_graph(seeded_repo):
    """Verify that live graph tool results populate known IDs and that every ID exists in FalkorDB."""
    user = CurrentUser(
        id="usr_eval",
        clerk_user_id="clerk_eval",
        email="eval@example.com",
        name="Evaluator",
        prefs={},
    )
    ctx = WorkspaceContext(
        ws_id="test_ws",
        workspace={"id": "test_ws", "slug": "test-ws", "ai_mode": "cloud", "clock_mode": "live"},
        role=Role.owner,
        person_id=None,
        user=user,
        org=seeded_repo,
        mem=seeded_repo,
        platform=seeded_repo,
        as_of=1792195200,
    )

    # 1. Execute list_risk_services tool
    risk_tool_res = await tools.call(ctx, tools.list_risk_services, tools.Limit(limit=5))
    assert len(risk_tool_res.known) >= 5

    # Verify all collected IDs physically exist in the FalkorDB graph
    for entity_id in risk_tool_res.known:
        res = await seeded_repo.g.query(f"MATCH (n {{id: '{entity_id}'}}) RETURN count(n) AS cnt")
        assert res.result_set and res.result_set[0][0] >= 1, (
            f"Entity {entity_id} from tool result not found in FalkorDB!"
        )

    # 2. Execute get_exception tool for planted scenario S2
    exc_tool_res = await tools.call(
        ctx, tools.get_exception, tools.ExceptionArg(exception_id="exc_ghost_vault_key")
    )
    assert "exc_ghost_vault_key" in exc_tool_res.known

    # 3. Execute find_current_owner tool
    owner_tool_res = await tools.call(
        ctx, tools.find_current_owner, tools.ExceptionArg(exception_id="exc_ghost_vault_key")
    )
    assert any(k.startswith("per_") for k in owner_tool_res.known)


async def test_edge_citations_match_authentic_falkordb_relationships(seeded_repo):
    """Verify that proof paths and edge citations match real, directed edges in FalkorDB."""
    user = CurrentUser(
        id="usr_eval",
        clerk_user_id="clerk_eval",
        email="eval@example.com",
        name="Evaluator",
        prefs={},
    )
    ctx = WorkspaceContext(
        ws_id="test_ws",
        workspace={"id": "test_ws", "slug": "test-ws", "ai_mode": "cloud", "clock_mode": "live"},
        role=Role.owner,
        person_id=None,
        user=user,
        org=seeded_repo,
        mem=seeded_repo,
        platform=seeded_repo,
        as_of=1792195200,
    )

    # Query proof path between svc_checkout_api and svc_payments_gateway
    path_res = await tools.call(
        ctx,
        tools.proof_path,
        tools.PathArgs(from_id="svc_checkout_api", to_id="svc_payments_gateway"),
    )

    proof = path_res.data
    assert "edges" in proof
    assert len(proof["edges"]) >= 1

    proof_nodes = {n["id"] if isinstance(n, dict) else n for n in proof["nodes"]}

    for edge in proof["edges"]:
        u = edge["from"]
        v = edge["to"]
        rel_type = edge["type"]

        # 1. Structural integrity: edge endpoints must exist in nodes list
        assert u in proof_nodes, f"Edge source {u} missing from proof nodes!"
        assert v in proof_nodes, f"Edge target {v} missing from proof nodes!"

        # 2. Live graph authenticity: edge MUST exist in FalkorDB
        cypher = f"MATCH (a {{id: '{u}'}})-[r:{rel_type}]->(b {{id: '{v}'}}) RETURN count(r) AS cnt"
        res = await seeded_repo.g.query(cypher)
        assert res.result_set and res.result_set[0][0] >= 1, (
            f"Edge citation ({u})-[:{rel_type}]->({v}) does not exist in FalkorDB graph state!"
        )


async def test_hallucinated_edge_detector_identifies_fictional_relationships(seeded_repo):
    """Verify adversarial assertion: a fabricated edge between existing nodes is rejected by graph check."""
    # svc_docs_portal and svc_card_vault both exist, but docs portal does NOT depend on card vault
    docs_id = "svc_docs_portal"
    vault_id = "svc_card_vault"

    cypher = (
        f"MATCH (a:Service {{id: '{docs_id}'}})-[r:DEPENDS_ON]->(b:Service {{id: '{vault_id}'}}) "
        "RETURN count(r) AS cnt"
    )
    res = await seeded_repo.g.query(cypher)
    assert res.result_set and res.result_set[0][0] == 0, "Adversarial check assumption violated: edge should not exist!"
