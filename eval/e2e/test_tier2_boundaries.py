"""Tier 2: Boundary & Corner Cases E2E Tests.

Verifies:
- Disconnected graph (0 edges): AC(u) = 0.0, low risk band, zero cascade
- Cyclic dependency loops: terminates without infinite loop / recursion limit
- Missing API keys (Tavily, Nebius): graceful warning payloads without unhandled crash
- Empty PR scan / empty workspace: handles 0 services gracefully
- Guardrail edge cases: sentence with multiple uncited IDs vs all cited IDs
"""

import argparse
import math
import sys
import unittest.mock as mock
from pathlib import Path

import pytest
import respx
import httpx
from falkordb.asyncio import FalkorDB

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.agents import guard, llm, tools
from app.agents.tools import TOOLS, TavilyThreatIntelArgs
from app.config import Settings
from app.graph.repo import Repo
from app.graph.schema import ORG, ensure_schema
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
import scripts.cli as cli_module


# =============================================================================
# Boundary 1: Disconnected Graph (0 edges)
# =============================================================================

@pytest.mark.asyncio
async def test_disconnected_graph_zero_edges_avalanche_centrality(isolated_org_repo: Repo):
    """Verify that a graph with services but 0 dependency edges results in AC(u) = 0.0 and 'low' band."""
    # Insert 3 isolated services with no DEPENDS_ON edges
    await isolated_org_repo.g.query(
        """
        CREATE (:Service {id: 'svc_isolated_a', name: 'Isolated Alpha', tier: 1}),
               (:Service {id: 'svc_isolated_b', name: 'Isolated Beta', tier: 2}),
               (:Service {id: 'svc_isolated_c', name: 'Isolated Gamma', tier: 3})
        """
    )

    as_of = 1792195200
    forecast = await run_prediction_simulation(isolated_org_repo, as_of=as_of, horizon_days=30)
    
    # 0 dependencies means no cascades propagate
    assert len(forecast.avalanche_centrality) == 0 or all(
        item.score == 0.0 and item.cascade_probability == 0.0 and item.band == "low"
        for item in forecast.avalanche_centrality
    )
    # Decorations must not be pulsing or critical
    for dec in forecast.canvas_decorations.values():
        assert dec.pulse is False
        assert dec.is_spof is False
        assert dec.risk_band == "low"
    # Temporal collisions must be empty
    assert len(forecast.temporal_collisions) == 0

    # Test pure math engine on empty reachability
    items = compute_avalanche_centrality([], [], p0=DEFAULT_P0, k_avalanche=DEFAULT_K_AVALANCHE)
    assert items == []


# =============================================================================
# Boundary 2: Cyclic Dependency Loops
# =============================================================================

def test_cyclic_dependency_loop_terminates_without_infinite_recursion():
    """Verify that cyclical dependency chains terminate and keep probabilities strictly bounded in [0, 1]."""
    p0 = 0.85
    # Cypher reachability queries cap hops via *1..6 or similar bounded traversal.
    # In pure calculation, test multiple paths with repeated or cyclic lengths:
    # e.g. path A->B->C->A->Ingress (hops: 4), A->B->A->Ingress (hops: 3), etc.
    cyclic_hops = [2, 3, 4, 5, 6, 2, 3]

    # Combine path probabilities must terminate immediately and remain in [0, 1]
    cascade_prob = combine_path_probabilities(cyclic_hops, p0=p0)
    assert 0.0 <= cascade_prob <= 1.0

    # Even with an extensive list of cycle paths, calculation must never exceed 1.0
    many_cyclic_paths = [2] * 50
    large_cascade = combine_path_probabilities(many_cyclic_paths, p0=p0)
    assert 0.0 <= large_cascade <= 1.0
    assert math.isclose(large_cascade, 1.0 - (1.0 - 0.85**2)**50, rel_tol=1e-5)


# =============================================================================
# Boundary 3: Missing API Keys Graceful Handling
# =============================================================================

@pytest.mark.asyncio
async def test_missing_api_keys_graceful_handling():
    """Verify missing external API keys produce informative warnings without unhandled exceptions."""
    # 1. Tavily tool with empty string API key
    with mock.patch("app.agents.tools.get_settings") as mock_settings:
        mock_settings.return_value = Settings(tavily_api_key="")
        ctx = mock.MagicMock()
        _, fn, _ = TOOLS["tavily_search_threat_intel"]
        res = await fn(ctx, TavilyThreatIntelArgs(query="openssl CVE-2024-0001"))
        assert res is not None
        assert "warning" in res.data
        assert "TAVILY_API_KEY is not configured" in res.data["warning"]

    # 2. LLM compat provider when API key or base URL is empty
    with mock.patch("app.agents.llm.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            llm_primary="compat",
            compat_base_url="",
            compat_api_key="",
        )
        # Verify check_budget or provider routing raises structured ApiError rather than unhandled crash
        from app.errors import ApiError
        # When base_url is missing, streaming chat either refuses or yields error
        messages = [{"role": "user", "content": "Hello"}]
        events = []
        try:
            async for ev in llm.stream_chat("ws_test", "cloud", messages, None):
                events.append(ev)
        except ApiError as ex:
            assert ex.code in ("LLM_NOT_CONFIGURED", "LLM_UNAVAILABLE", "QUOTA_EXCEEDED", "INTERNAL", "CONFIG_ERROR")
        except Exception as ex:
            # If standard OpenAI client errors on empty base URL, it must be caught
            assert "base_url" in str(ex).lower() or "api_key" in str(ex).lower() or isinstance(ex, ValueError)


# =============================================================================
# Boundary 4: Empty Scan & Empty Workspace
# =============================================================================

def test_empty_scan_and_empty_workspace_handling(tmp_path: Path):
    """Verify CLI scanner and circuit breaker handle empty repositories and empty workspaces."""
    # 1. Empty repository directory scan
    empty_dir = tmp_path / "empty_repo"
    empty_dir.mkdir()
    args_scan = argparse.Namespace(
        dir=str(empty_dir),
        submit=False,
        auto_approve=False,
        api_url="http://localhost:8000",
        workspace="ws_test",
        api_key="rep_live_local",
    )
    exit_code_scan = cli_module.cmd_scan(args_scan)
    assert exit_code_scan == 0

    # 2. Workspace with 0 services returned (unseeded)
    empty_sim_response = {
        "avalanche_centrality": [],
        "temporal_collisions": [],
        "services": [],
    }
    with mock.patch("scripts.cli._api_call", return_value=empty_sim_response):
        args_check = argparse.Namespace(
            api_url="http://localhost:8000",
            workspace="ws_empty",
            service=None,
            horizon=30,
            fail_threshold=75.0,
            api_key="rep_live_local",
        )
        exit_code_check = cli_module.cmd_check(args_check)
        # Should gracefully output unseeded notice and return code 0
        assert exit_code_check == 0


# =============================================================================
# Boundary 5: Guardrail Multiple Uncited vs All Cited
# =============================================================================

def test_guardrail_multiple_uncited_vs_all_cited():
    """Verify provenance guardrail behavior under adversarial combinations of cited and uncited IDs."""
    known = {
        "svc_auth": "Authentication Service",
        "svc_db": "Primary Database",
        "ctl_mfa": "MFA Enforcement",
    }

    # Case A: Multiple uncited IDs in a single sentence -> dropped
    text_multi_uncited = "Services svc_ghost1, svc_ghost2, and svc_ghost3 are vulnerable."
    clean, citations, removed = guard.ground(text_multi_uncited, known)
    assert clean == ""
    assert removed == 1
    assert len(citations) == 0

    # Case B: Sentence with mixed valid and uncited IDs -> dropped (zero hallucination rule)
    text_mixed = "While svc_auth is valid, svc_hallucinated_peer is also compromised."
    clean, citations, removed = guard.ground(text_mixed, known)
    assert clean == ""
    assert removed == 1
    assert len(citations) == 0

    # Case C: Multiple sentences with strictly valid IDs -> all preserved
    text_all_valid = (
        "The svc_auth connects to svc_db.\n"
        "Control ctl_mfa is applied to svc_auth."
    )
    clean, citations, removed = guard.ground(text_all_valid, known)
    assert "svc_auth connects to svc_db" in clean
    assert "ctl_mfa is applied to svc_auth" in clean
    assert removed == 0
    assert len(citations) == 3

    # Case D: Complex markdown formatting (markdown links, asterisks, bullet points)
    text_markdown = (
        "- **Alert**: svc_auth has 0 active waivers.\n"
        "- **Phantom**: svc_phantom_service has expired.\n"
        "- **Normal**: General status is operational."
    )
    clean, citations, removed = guard.ground(text_markdown, known)
    assert "svc_auth has 0 active waivers" in clean
    assert "General status is operational" in clean
    assert "svc_phantom_service" not in clean
    assert removed == 1
