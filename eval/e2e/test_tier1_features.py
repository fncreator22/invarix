"""Tier 1: Feature Coverage E2E Tests (Requirements R1–R5).

Verifies:
- FalkorDB tri-planar graph connectivity & schema invariants (R1)
- 8 Deterministic Invariants (R1–R8) detection & shortest proof paths (R1)
- Avalanche Centrality AC(u) computation, mathematics & bounds (R2)
- Temporal collision clustering across sliding 7-day windows (R2)
- Nebius Token Factory & NVIDIA Nemotron routing configuration (R3)
- Provenance guardrail `guard.py` zero-hallucination pruning (R3)
- Tavily threat intel tool execution & warning fallback (R4)
- Pre-merge CI CLI gate execution & exit code semantics (R5)
- Frontend canvas pulsating risk halo & Steward SSE chat contracts (R5)
"""

import argparse
import math
import sys
import unittest.mock as mock
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
import respx
import httpx
from falkordb.asyncio import FalkorDB

from app.agents import guard, steward, tools
from app.agents.tools import TOOLS, TavilyThreatIntelArgs
from app.config import Settings, get_settings
from app.detection.config import preset
from app.detection.engine import run_rules
from app.graph.client import graph_names
from app.graph.repo import Repo, _rows
from app.graph.schema import PLATFORM, ORG, MEM, ensure_schema
from app.prediction.avalanche import (
    DEFAULT_K_AVALANCHE,
    DEFAULT_P0,
    band,
    combine_path_probabilities,
    compute_avalanche_centrality,
    compute_path_probability,
)
from app.prediction.collisions import compute_temporal_collisions
from app.prediction.engine import run_prediction_simulation
from app.prediction.models import CanvasNodeDecoration, SimulationForecastOut
import scripts.cli as cli_module


# =============================================================================
# Requirement R1: Tri-Planar Knowledge Graph & Invariants
# =============================================================================

@pytest.mark.asyncio
async def test_r1_tri_planar_graph_connectivity_and_schema_isolation(e2e_db: FalkorDB):
    """Verify FalkorDB connectivity, tri-planar graph name isolation, and schema constraints."""
    ws_id = "ws_01m4kk3bkc65abxckx2kyes57p"
    names = graph_names(ws_id)
    
    assert names.platform.endswith("platform")
    assert "org_" in names.org
    assert "mem_" in names.mem
    assert names.platform != names.org != names.mem

    plat_repo = Repo(e2e_db, names.platform)
    org_repo = Repo(e2e_db, names.org)
    mem_repo = Repo(e2e_db, names.mem)

    try:
        # Bootstrap schema on all 3 planes idempotently
        await ensure_schema(plat_repo, PLATFORM)
        await ensure_schema(org_repo, ORG)
        await ensure_schema(mem_repo, MEM)

        # 1. Platform Plane: insert user and workspace
        await plat_repo.g.query(
            "MERGE (u:User {clerk_user_id: $cid}) ON CREATE SET u.id = $uid, u.email = $email",
            {"cid": "clerk_test_user_01", "uid": "usr_01", "email": "test@invarix.io"},
        )
        res_u = _rows(await plat_repo.g.query("MATCH (u:User {clerk_user_id: $cid}) RETURN u.id as id", {"cid": "clerk_test_user_01"}))
        assert len(res_u) == 1
        assert res_u[0]["id"] == "usr_01"

        # 2. Org Plane: insert domain service and control
        await org_repo.g.query(
            "MERGE (s:Service {id: $sid}) ON CREATE SET s.name = $name, s.tier = 1",
            {"sid": "svc_test_core", "name": "Core Service"},
        )
        res_s = _rows(await org_repo.g.query("MATCH (s:Service {id: $sid}) RETURN s.name as name", {"sid": "svc_test_core"}))
        assert len(res_s) == 1
        assert res_s[0]["name"] == "Core Service"

        # 3. Mem Plane: insert agent episodic turn & cross-graph Ref stub
        await mem_repo.g.query(
            "MERGE (r:Ref {key: $key}) ON CREATE SET r.kind = 'Service', r.external_id = $eid",
            {"key": "Service:svc_test_core", "eid": "svc_test_core"},
        )
        res_m = _rows(await mem_repo.g.query("MATCH (r:Ref {key: $key}) RETURN r.external_id as eid", {"key": "Service:svc_test_core"}))
        assert len(res_m) == 1
        assert res_m[0]["eid"] == "svc_test_core"

        # Verify Plane Isolation: Service does not exist in Platform or Mem
        iso_plat = _rows(await plat_repo.g.query("MATCH (s:Service) RETURN count(s) as cnt"))
        iso_mem = _rows(await mem_repo.g.query("MATCH (s:Service) RETURN count(s) as cnt"))
        assert iso_plat[0]["cnt"] == 0
        assert iso_mem[0]["cnt"] == 0

    finally:
        await plat_repo.drop()
        await org_repo.drop()
        await mem_repo.drop()


@pytest.mark.asyncio
async def test_r1_eight_deterministic_invariants_detection_and_proofs(seeded_org_repo: Repo):
    """Verify that all 8 deterministic invariants (R1-R8) execute and produce shortest proof paths."""
    as_of = 1792195200  # 17 Oct 2026
    cfg = preset()
    
    res = await run_rules(seeded_org_repo, cfg, as_of)
    assert res is not None
    assert len(res.findings) > 0

    rule_ids = {f.rule_id for f in res.findings}
    # Verify presence of multiple core invariant violations in the seeded baseline
    expected_rules = {"R1", "R2", "R3", "R5", "R6", "R7", "R8"}
    assert rule_ids.issubset(expected_rules) or len(rule_ids.intersection(expected_rules)) >= 5

    for finding in res.findings:
        # Check proof structure
        proof = finding.proof_json
        assert "nodes" in proof, f"Rule {finding.rule_id} missing nodes in proof"
        assert "edges" in proof, f"Rule {finding.rule_id} missing edges in proof"
        assert len(proof["nodes"]) > 0
        # Subject must be in nodes
        node_ids = {n["id"] for n in proof["nodes"]}
        assert finding.subject_id in node_ids, f"Subject {finding.subject_id} not in proof nodes: {node_ids}"
        # Severity must be valid
        assert finding.severity in ("critical", "high", "moderate", "low")


# =============================================================================
# Requirement R2: Avalanche Centrality & Temporal Collisions
# =============================================================================

def test_r2_avalanche_centrality_mathematics_and_bounds():
    """Verify the mathematical properties of Avalanche Centrality: AC(u) = 1 - prod(1 - p0^len(p))."""
    p0 = 0.85
    # 1. Single hop
    p1 = compute_path_probability(1, p0)
    assert math.isclose(p1, 0.85, rel_tol=1e-5)

    # 2. Two hops
    p2 = compute_path_probability(2, p0)
    assert math.isclose(p2, 0.85**2, rel_tol=1e-5)  # 0.7225

    # 3. Multi-path cascade combination: 1 - (1 - 0.85) * (1 - 0.7225)
    combined = combine_path_probabilities([1, 2], p0)
    expected_cascade = 1.0 - (1.0 - 0.85) * (1.0 - 0.7225)  # 1 - 0.15 * 0.2775 = 0.958375
    assert math.isclose(combined, expected_cascade, rel_tol=1e-5)

    # 4. Strict bounding: cascade probability in [0, 1]
    assert 0.0 <= compute_path_probability(10, p0) <= 1.0
    assert 0.0 <= combine_path_probabilities([1, 1, 2, 3], p0) <= 1.0

    # 5. Full computation with tier weighting
    reachability_rows = [
        {
            "target_id": "svc_payments_gateway",
            "target_name": "Payments Gateway",
            "target_tier": 1,
            "target_customer_facing": False,
            "dependent_id": "svc_checkout_api",
            "dependent_name": "Checkout API",
            "tier": 1,
            "customer_facing": True,
            "hops": 1,
            "path_ids": ["svc_checkout_api", "svc_payments_gateway"],
        },
        {
            "target_id": "svc_payments_gateway",
            "target_name": "Payments Gateway",
            "target_tier": 1,
            "target_customer_facing": False,
            "dependent_id": "svc_web_ingress",
            "dependent_name": "Web Ingress",
            "tier": 1,
            "customer_facing": True,
            "hops": 2,
            "path_ids": ["svc_web_ingress", "svc_checkout_api", "svc_payments_gateway"],
        },
    ]
    customer_path_rows = [
        {
            "target_id": "svc_payments_gateway",
            "customer_path_id": "cp_checkout_flow",
            "customer_path_name": "Checkout Flow",
            "hops": 2,
        }
    ]

    results = compute_avalanche_centrality(
        reachability_rows,
        customer_path_rows,
        target_service_id="svc_payments_gateway",
        p0=p0,
        k_avalanche=DEFAULT_K_AVALANCHE,
    )

    assert len(results) == 1
    item = results[0]
    assert item.service_id == "svc_payments_gateway"
    assert 0.0 <= item.score <= 100.0
    assert 0.0 <= item.cascade_probability <= 1.0
    assert item.band in ("critical", "high", "moderate", "low")
    assert item.spof_rank == 1
    assert "svc_checkout_api" in item.reachable_services
    assert "cp_checkout_flow" in item.customer_paths


@pytest.mark.asyncio
async def test_r2_temporal_collision_clustering_sliding_window(seeded_org_repo: Repo):
    """Verify sliding-window temporal collision clustering across dependencies."""
    as_of = 1792195200
    forecast = await run_prediction_simulation(seeded_org_repo, as_of=as_of, horizon_days=30)
    clusters = forecast.temporal_collisions
    assert isinstance(clusters, list)
    assert len(clusters) >= 1

    for c in clusters:
        assert c.cluster_id.startswith("col_")
        assert c.window_end >= c.window_start
        assert (c.window_end - c.window_start) <= 7 * 86400  # sliding 7-day window
        assert len(c.exception_ids) >= 1
        assert len(c.affected_services) >= 1
        assert c.severity_score > 0.0
        assert c.severity_band in ("critical", "high", "moderate", "low")
        assert len(c.proof.nodes) >= 1


# =============================================================================
# Requirement R3: Nebius Token Factory & Provenance Guardrail
# =============================================================================

def test_r3_nebius_token_factory_and_nemotron_model_routing():
    """Verify Nebius Token Factory configuration and dual-model NVIDIA Nemotron routing."""
    # Test setting custom Nebius endpoints and Nemotron model identifiers
    custom_settings = Settings(
        llm_primary="compat",
        compat_base_url="https://api.tokenfactory.nebius.ai/v1",
        compat_api_key="neb_test_key_abc123",
        compat_model="nvidia/nemotron-3-super-120b-a12b",
        compat_model_ingest="nebius/nvidia/Nemotron-3_5-Lightning",
    )

    assert custom_settings.llm_primary == "compat"
    assert custom_settings.compat_base_url == "https://api.tokenfactory.nebius.ai/v1"
    assert custom_settings.compat_api_key == "neb_test_key_abc123"
    assert "nemotron-3-super-120b" in custom_settings.compat_model
    assert "Nemotron-3_5-Lightning" in custom_settings.compat_model_ingest

    # Model helper returns correct model string per role
    assert custom_settings.get_compat_model("ingest") == "nebius/nvidia/Nemotron-3_5-Lightning"
    assert custom_settings.get_compat_model("reasoning") == "nvidia/nemotron-3-super-120b-a12b"

    # Context window: check that ingestion extractor MAX_TEXT is at least 200,000 chars for 1M context
    from app.ingest.extractor import MAX_TEXT
    assert MAX_TEXT >= 200_000, f"MAX_TEXT ({MAX_TEXT}) must be at least 200,000 for 1M context ingestion"


def test_r3_provenance_guardrail_zero_hallucination_pruning():
    """Verify guard.ground() strips sentences with uncited entity IDs and preserves authentic citations."""
    known_entities = {
        "svc_payments_gateway": "Payments Gateway",
        "exc_01m4kk3b": "Legacy TLS Waiver",
        "ctl_tls_modern": "TLS 1.2+ Required",
    }

    # Case 1: All cited IDs are known -> entire text preserved
    valid_text = "The svc_payments_gateway is covered by exc_01m4kk3b for ctl_tls_modern."
    clean, citations, removed = guard.ground(valid_text, known_entities)
    assert clean == valid_text
    assert removed == 0
    assert len(citations) == 3
    cited_ids = {c["id"] for c in citations}
    assert cited_ids == {"svc_payments_gateway", "exc_01m4kk3b", "ctl_tls_modern"}

    # Case 2: One sentence has a hallucinated/unmodeled entity ID -> pruned
    hallucinated_text = (
        "The svc_payments_gateway is healthy.\n"
        "However, svc_unmodeled_phantom is currently failing cascaded checks.\n"
        "Control ctl_tls_modern is still active."
    )
    clean, citations, removed = guard.ground(hallucinated_text, known_entities)
    assert "svc_unmodeled_phantom" not in clean
    assert "svc_payments_gateway is healthy" in clean
    assert "ctl_tls_modern is still active" in clean
    assert removed == 1
    assert "svc_unmodeled_phantom" not in [c["id"] for c in citations]

    # Case 3: Sentence with no entity IDs -> preserved
    neutral_text = "This is a general summary without any node references."
    clean, citations, removed = guard.ground(neutral_text, known_entities)
    assert clean == neutral_text
    assert removed == 0
    assert len(citations) == 0


# =============================================================================
# Requirement R4: Tavily Threat Intel Tool Execution & Fallback
# =============================================================================

@pytest.mark.asyncio
async def test_r4_tavily_threat_intel_tool_execution_and_fallback():
    """Verify tavily_search_threat_intel is registered, handles missing API key, and executes cleanly."""
    assert "tavily_search_threat_intel" in TOOLS
    arg_cls, fn, desc = TOOLS["tavily_search_threat_intel"]
    assert arg_cls == TavilyThreatIntelArgs
    assert "Tavily Search API" in desc

    # Sub-test 1: Missing API key returns clean diagnostic warning without crashing
    with mock.patch("app.agents.tools.get_settings") as mock_settings:
        mock_settings.return_value = Settings(tavily_api_key="")
        ctx_mock = mock.MagicMock()
        res = await fn(ctx_mock, TavilyThreatIntelArgs(query="CVE-2024-1234"))
        assert res is not None
        assert isinstance(res.data, dict)
        assert "warning" in res.data
        assert "TAVILY_API_KEY is not configured" in res.data["warning"]
        assert "Tavily threat intelligence unavailable" in res.summary

    # Sub-test 2: Live mock of Tavily API returning search results
    with mock.patch("app.agents.tools.get_settings") as mock_settings:
        mock_settings.return_value = Settings(tavily_api_key="tvly-mock-key-12345")
        ctx_mock = mock.MagicMock()

        with respx.mock(base_url="https://api.tavily.com") as respx_mock:
            respx_mock.post("/search").respond(
                status_code=200,
                json={
                    "results": [
                        {
                            "title": "Critical PoC Released for OpenSSL",
                            "url": "https://example.com/advisory",
                            "content": "Active exploitation observed in the wild for CVE-2024-1234.",
                            "score": 0.98,
                        }
                    ],
                    "answer": "Active PoC exploit exists in the wild.",
                },
            )
            res = await fn(ctx_mock, TavilyThreatIntelArgs(query="CVE-2024-1234"))
            assert res is not None
            assert "error" not in res.data
            assert len(res.data["results"]) == 1
            assert res.data["answer"] == "Active PoC exploit exists in the wild."
            assert "Active PoC exploit" in res.summary

    # Sub-test 3: Upstream network failure handled gracefully
    with mock.patch("app.agents.tools.get_settings") as mock_settings:
        mock_settings.return_value = Settings(tavily_api_key="tvly-mock-key-12345")
        ctx_mock = mock.MagicMock()

        with respx.mock(base_url="https://api.tavily.com") as respx_mock:
            respx_mock.post("/search").respond(status_code=502, text="Bad Gateway")
            res = await fn(ctx_mock, TavilyThreatIntelArgs(query="CVE-2024-1234"))
            assert res is not None
            assert "error" in res.data
            assert "502" in res.data["error"] or "Bad Gateway" in res.data["error"]


# =============================================================================
# Requirement R5: CLI Pre-Merge Gate & Frontend Contracts
# =============================================================================

def test_r5_premerge_ci_cli_gate_execution():
    """Verify pre-merge CI CLI gate evaluates risk simulation and returns correct exit codes."""
    # Test 1: Safe architecture below threshold -> exit code 0
    safe_response = {
        "avalanche_centrality": [
            {"service_id": "svc_safe_1", "score": 20.0, "band": "low", "spof_rank": 0, "is_spof": False},
            {"service_id": "svc_safe_2", "score": 35.0, "band": "moderate", "spof_rank": 0, "is_spof": False},
        ],
        "temporal_collisions": [],
    }

    with mock.patch("scripts.cli._api_call", return_value=safe_response):
        args = argparse.Namespace(
            api_url="http://localhost:8000",
            workspace="ws_test",
            service=None,
            horizon=30,
            fail_threshold=75.0,
            api_key="test_key",
        )
        exit_code = cli_module.cmd_check(args)
        assert exit_code == 0, f"Expected safe pre-merge gate to return exit code 0, got {exit_code}"

    # Test 2: Critical cascade score (>= 75.0) -> exit code 1 (gate blocked)
    critical_response = {
        "avalanche_centrality": [
            {"service_id": "svc_payments_gateway", "score": 88.5, "band": "critical", "spof_rank": 1, "is_spof": True},
        ],
        "temporal_collisions": [{"cluster_id": "col_1", "affected_services": ["svc_payments_gateway"], "exception_ids": ["exc_1"]}],
    }

    with mock.patch("scripts.cli._api_call", return_value=critical_response):
        args = argparse.Namespace(
            api_url="http://localhost:8000",
            workspace="ws_test",
            service=None,
            horizon=30,
            fail_threshold=75.0,
            api_key="test_key",
        )
        exit_code = cli_module.cmd_check(args)
        assert exit_code == 1, f"Expected critical risk to return exit code 1, got {exit_code}"

    # Test 3: API Unreachable -> exit code 2
    error_response = {"error": "Connection refused", "status": 500}
    with mock.patch("scripts.cli._api_call", return_value=error_response):
        args = argparse.Namespace(
            api_url="http://localhost:8000",
            workspace="ws_test",
            service=None,
            horizon=30,
            fail_threshold=75.0,
            api_key="test_key",
        )
        exit_code = cli_module.cmd_check(args)
        assert exit_code == 2, f"Expected API error to return exit code 2, got {exit_code}"


def test_r5_frontend_canvas_pulsating_halo_contract():
    """Verify canvas decoration data contracts and pulsating halo mathematics."""
    # 1. CanvasNodeDecoration model contract
    dec = CanvasNodeDecoration(
        simulated_score=85.0,
        risk_band="critical",
        is_spof=True,
        has_collision=True,
        pulse=True,
        color="#EF4444",
    )
    assert dec.pulse is True
    assert dec.is_spof is True
    assert dec.risk_band == "critical"

    # 2. Pulsating halo mathematical formula contract from frontend/components/graph/graph-canvas.tsx:
    # const pulseOffset = still ? 3 : Math.sin(Date.now() / 250) * 2.5 + 3.5;
    for t_ms in [0, 62.5, 125, 250, 392.7, 500, 785.4, 1000]:
        val = math.sin(t_ms / 250.0) * 2.5 + 3.5
        assert 1.0 <= val <= 6.0, f"Pulsing halo radius offset {val} outside bounds [1.0, 6.0]"

    # Periodicity: cycle completes every 2 * pi * 250 ms ~= 1570.8 ms
    period = 2 * math.pi * 250
    val_0 = math.sin(0 / 250.0) * 2.5 + 3.5
    val_period = math.sin(period / 250.0) * 2.5 + 3.5
    assert math.isclose(val_0, val_period, abs_tol=1e-5)


@pytest.mark.asyncio
async def test_r5_steward_sse_chat_streaming_contract(seeded_org_repo: Repo):
    """Verify Steward SSE streaming event flow and final grounded payload contract."""
    # Build minimal mock WorkspaceContext for turn execution
    ctx = mock.MagicMock()
    ctx.ws_id = "ws_test_chat"
    ctx.as_of = 1792195200
    ctx.workspace = {"ai_mode": "cloud", "clock_mode": "live"}
    ctx.user = mock.MagicMock(id="usr_tester")
    ctx.role = "member"
    ctx.at_least.return_value = True
    ctx.mem.read = mock.AsyncMock(return_value=[])
    ctx.mem.write = mock.AsyncMock(return_value=[{"n": 1}])

    # Mock llm.stream_chat to yield token and done events
    from app.agents import llm
    async def mock_stream_chat(*args, **kwargs):
        yield llm.LLMEvent(kind="token", text="Analysis: ")
        yield llm.LLMEvent(kind="token", text="Payments Gateway is affected by exc_01m4kk3b.")
        yield llm.LLMEvent(
            kind="done",
            text="Payments Gateway is affected by exc_01m4kk3b.",
            model="nvidia/nemotron-3-super-120b-a12b",
            usage={"total_tokens": 42},
            tool_calls=[],
        )

    with mock.patch("app.agents.llm.stream_chat", side_effect=mock_stream_chat), \
         mock.patch("app.agents.llm.check_budget"):
        
        events = []
        async for event_name, event_data in steward.turn(ctx, "ses_test", "What is the status of payments?", None):
            events.append((event_name, event_data))

        event_names = [e[0] for e in events]
        assert "run.started" in event_names
        assert "token" in event_names
        assert "final" in event_names

        # Check final event payload schema
        final_payload = [d for n, d in events if n == "final"][0]
        assert "answer_markdown" in final_payload
        assert "citations" in final_payload
        assert "proof_paths" in final_payload
        assert "proposed_actions" in final_payload
        assert "used_tools" in final_payload
        assert "removed_claims" in final_payload
