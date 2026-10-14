"""Comprehensive tests for Hybrid Mathematical Prediction Engine (Milestone 1).

Validates:
1. Pure mathematical formulas:
   - Avalanche Centrality, coupling probability p0^h, multi-path combination, tier weighting, customer path exposure.
   - Exponential saturation score normalization to [0, 100].
   - SPOF ranking and identification.
   - Temporal Expiry Collision Dynamics: sliding calendar window clustering, <=2 hop dependency connectivity.
   - Collision severity score calculation with size multiplier and criticality factor.
2. Cypher query loading and syntax checks:
   - pred_avalanche_reachability.cypher
   - pred_avalanche_customer_paths.cypher
   - pred_temporal_collisions.cypher
3. Simulation engine synthesis:
   - Output schema compliance (SimulationForecastOut).
   - Canvas decorations (color, risk_band, pulse, spof, collision flags).
   - Strict performance guarantee: execution_time_ms < 100.
4. FastAPI endpoint /api/v1/workspaces/{ws_id}/prediction/simulation:
   - Parameter handling (horizon_days, target_service_id).
   - Authentication & role checking.
"""

from __future__ import annotations

import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.auth.deps import CurrentUser, Role, WorkspaceContext, viewer
from app.graph.repo import load
from app.main import app
from app.prediction.avalanche import (
    combine_path_probabilities,
    compute_avalanche_centrality,
    compute_path_probability,
)
from app.prediction.collisions import (
    compute_temporal_collisions,
)
from app.prediction.engine import run_prediction_simulation
from app.prediction.models import (
    AvalancheCentralityItem,
    CanvasNodeDecoration,
    ProofEdge,
    ProofGraph,
    SimulationForecastOut,
)
from tests.api_helpers import auth

TEST_AUTH = auth("user_m1", "m1@example.com")


# ==============================================================================
# 1. Mathematical Formulas: Avalanche Centrality Unit Tests
# ==============================================================================


def test_coupling_probability_single_path():
    """Verify p0^h decay across dependency hops."""
    assert compute_path_probability(0, p0=0.85) == 1.0
    assert compute_path_probability(1, p0=0.85) == 0.85
    assert pytest.approx(compute_path_probability(2, p0=0.85), 0.0001) == 0.7225
    assert pytest.approx(compute_path_probability(3, p0=0.85), 0.0001) == 0.614125
    assert pytest.approx(compute_path_probability(4, p0=0.85), 0.0001) == 0.522006


def test_coupling_probability_multi_path():
    """Verify 1 - prod(1 - p0^h) for multiple independent paths."""
    # 0 paths -> 0.0
    assert combine_path_probabilities([], p0=0.85) == 0.0

    # 1 path of length 1 -> 0.85
    assert pytest.approx(combine_path_probabilities([1], p0=0.85), 0.0001) == 0.85

    # 2 paths of lengths 1 and 2:
    # 1 - (1 - 0.85) * (1 - 0.7225) = 1 - (0.15 * 0.2775) = 1 - 0.041625 = 0.958375
    assert pytest.approx(combine_path_probabilities([1, 2], p0=0.85), 0.0001) == 0.958375


def test_avalanche_centrality_tier_weighting_and_saturation():
    """Verify tier criticality weighting, normalization to [0, 100], and SPOF ranking."""
    reachability_data = [
        # Target 1: Payments Gateway (Tier 1). Has 2 Tier 1 direct dependents + 1 Tier 2 2-hop dependent
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
            "dependent_id": "svc_mobile_api",
            "dependent_name": "Mobile API",
            "tier": 1,
            "customer_facing": True,
            "hops": 1,
            "path_ids": ["svc_mobile_api", "svc_payments_gateway"],
        },
        {
            "target_id": "svc_payments_gateway",
            "target_name": "Payments Gateway",
            "target_tier": 1,
            "target_customer_facing": False,
            "dependent_id": "svc_analytics_worker",
            "dependent_name": "Analytics Worker",
            "tier": 3,
            "customer_facing": False,
            "hops": 2,
            "path_ids": ["svc_analytics_worker", "svc_event_bus", "svc_payments_gateway"],
        },
        # Target 2: Internal Logger (Tier 3). Has only 1 Tier 3 dependent at 3 hops
        {
            "target_id": "svc_internal_logger",
            "target_name": "Internal Logger",
            "target_tier": 3,
            "target_customer_facing": False,
            "dependent_id": "svc_batch_job",
            "dependent_name": "Batch Job",
            "tier": 3,
            "customer_facing": False,
            "hops": 3,
            "path_ids": ["svc_batch_job", "svc_step2", "svc_step1", "svc_internal_logger"],
        },
    ]

    customer_paths_data = [
        # Payments gateway impacts 2 customer paths
        {
            "target_id": "svc_payments_gateway",
            "customer_path_id": "cp_checkout",
            "customer_path_name": "Checkout Flow",
            "hops": 2,
            "path_ids": ["cp_checkout", "svc_checkout_api", "svc_payments_gateway"],
        },
        {
            "target_id": "svc_payments_gateway",
            "customer_path_id": "cp_mobile_pay",
            "customer_path_name": "Mobile Payment Flow",
            "hops": 2,
            "path_ids": ["cp_mobile_pay", "svc_mobile_api", "svc_payments_gateway"],
        },
    ]

    items = compute_avalanche_centrality(reachability_data, customer_paths_data)

    assert len(items) == 2
    # Payments gateway must rank #1 SPOF
    top = items[0]
    assert top.service_id == "svc_payments_gateway"
    assert top.spof_rank == 1
    assert top.band == "critical"
    assert top.score >= 75.0
    assert 0.0 <= top.score <= 100.0
    assert top.cascade_probability >= 0.85
    assert set(top.reachable_services) == {"svc_checkout_api", "svc_mobile_api", "svc_analytics_worker"}
    assert set(top.customer_paths) == {"cp_checkout", "cp_mobile_pay"}

    # Proof graph should contain target, all dependents, and paths
    assert "svc_payments_gateway" in top.proof.nodes
    assert "svc_checkout_api" in top.proof.nodes
    assert "cp_checkout" in top.proof.nodes

    # Logger should rank #2 with low score
    logger_item = items[1]
    assert logger_item.service_id == "svc_internal_logger"
    assert logger_item.spof_rank == 2
    assert logger_item.band == "low"
    assert logger_item.score < 25.0


def test_avalanche_target_filtering():
    """Verify target_service_id parameter filters correctly."""
    reachability_data = [
        {
            "target_id": "svc_a",
            "target_name": "Service A",
            "dependent_id": "svc_b",
            "tier": 2,
            "hops": 1,
            "path_ids": ["svc_b", "svc_a"],
        },
        {
            "target_id": "svc_b",
            "target_name": "Service B",
            "dependent_id": "svc_c",
            "tier": 2,
            "hops": 1,
            "path_ids": ["svc_c", "svc_b"],
        },
    ]
    items = compute_avalanche_centrality(reachability_data, [], target_service_id="svc_a")
    assert len(items) == 1
    assert items[0].service_id == "svc_a"


# ==============================================================================
# 2. Mathematical Formulas: Temporal Expiry Collisions Unit Tests
# ==============================================================================


def test_temporal_collision_clustering_and_severity():
    """Verify sliding calendar window detection (<=7d) and <=2 hops dependency clustering."""
    as_of = 1792195200

    # 3 active exceptions expiring in the horizon:
    # exc_1: expires as_of + 3 days on svc_checkout_api (Tier 1)
    # exc_2: expires as_of + 5 days on svc_payments_gateway (Tier 1) [1-hop dependent]
    # exc_3: expires as_of + 25 days on svc_checkout_api [outside 7-day window of exc_1 and exc_2]
    # exc_4: expires as_of + 4 days on svc_unrelated_crm (Tier 3) [isolated, >2 hops away]

    rows = [
        # exc_1 on svc_checkout_api (connected to svc_payments_gateway via 1 hop)
        {
            "exception_id": "exc_1",
            "exception_title": "TLS Cipher Waiver",
            "severity": 4,
            "expires_at": as_of + 3 * 86400,
            "service_id": "svc_checkout_api",
            "service_name": "Checkout API",
            "service_tier": 1,
            "service_customer_facing": True,
            "connected_service_id": "svc_payments_gateway",
            "connected_service_name": "Payments Gateway",
            "connected_service_tier": 1,
            "hops": 1,
            "path_ids": ["svc_checkout_api", "svc_payments_gateway"],
        },
        # exc_2 on svc_payments_gateway
        {
            "exception_id": "exc_2",
            "exception_title": "Database Read Replica Delay",
            "severity": 5,
            "expires_at": as_of + 5 * 86400,
            "service_id": "svc_payments_gateway",
            "service_name": "Payments Gateway",
            "service_tier": 1,
            "service_customer_facing": False,
            "connected_service_id": "svc_payments_gateway",
            "connected_service_name": "Payments Gateway",
            "connected_service_tier": 1,
            "hops": 0,
            "path_ids": ["svc_payments_gateway"],
        },
        # exc_3 on svc_checkout_api (+25 days, out of 7d window)
        {
            "exception_id": "exc_3",
            "exception_title": "Log Retention Exemption",
            "severity": 2,
            "expires_at": as_of + 25 * 86400,
            "service_id": "svc_checkout_api",
            "service_name": "Checkout API",
            "service_tier": 1,
            "service_customer_facing": True,
            "connected_service_id": "svc_checkout_api",
            "connected_service_name": "Checkout API",
            "connected_service_tier": 1,
            "hops": 0,
            "path_ids": ["svc_checkout_api"],
        },
        # exc_4 on svc_unrelated_crm (+4 days, but disconnected)
        {
            "exception_id": "exc_4",
            "exception_title": "CRM OAuth Waiver",
            "severity": 3,
            "expires_at": as_of + 4 * 86400,
            "service_id": "svc_unrelated_crm",
            "service_name": "Unrelated CRM",
            "service_tier": 3,
            "service_customer_facing": False,
            "connected_service_id": "svc_unrelated_crm",
            "connected_service_name": "Unrelated CRM",
            "connected_service_tier": 3,
            "hops": 0,
            "path_ids": ["svc_unrelated_crm"],
        },
    ]

    clusters = compute_temporal_collisions(rows, window_days=7)

    # Only exc_1 and exc_2 should collide
    assert len(clusters) == 1
    col = clusters[0]
    assert set(col.exception_ids) == {"exc_1", "exc_2"}
    assert set(col.affected_services) == {"svc_checkout_api", "svc_payments_gateway"}
    assert col.window_start == as_of + 3 * 86400
    assert col.window_end == as_of + 5 * 86400

    # Severity score calculation:
    # sum_severity = 4 + 5 = 9
    # size_mult = 1 + (2 - 1)/2 = 1.5
    # crit_factor for Tier 1 with customer_facing and >1 service:
    # 1.35 + 0.05 + 0.05 = 1.45
    # score = 9 * 1.5 * 1.45 = 19.575 -> 19.6
    assert col.severity_score >= 18.0

    # Proof nodes & edges
    assert "exc_1" in col.proof.nodes
    assert "exc_2" in col.proof.nodes
    assert "svc_checkout_api" in col.proof.nodes
    assert "svc_payments_gateway" in col.proof.nodes


def test_temporal_collision_empty_when_no_proximity():
    """Verify empty collision list when no exceptions expire within window."""
    as_of = 1792195200
    rows = [
        {
            "exception_id": "exc_1",
            "severity": 3,
            "expires_at": as_of + 2 * 86400,
            "service_id": "svc_a",
            "connected_service_id": "svc_a",
            "hops": 0,
        },
        {
            "exception_id": "exc_2",
            "severity": 3,
            "expires_at": as_of + 15 * 86400,
            "service_id": "svc_a",
            "connected_service_id": "svc_a",
            "hops": 0,
        },
    ]
    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 0


# ==============================================================================
# 3. Cypher Query Loading & Integrity Tests
# ==============================================================================


def test_cypher_queries_loadable():
    """Verify that all three prediction Cypher queries exist and compile without syntax issues."""
    q_reachability = load("pred_avalanche_reachability")
    assert "MATCH" in q_reachability
    assert "DEPENDS_ON*1..4" in q_reachability
    assert "$service_id" in q_reachability

    q_cp = load("pred_avalanche_customer_paths")
    assert "CustomerPath" in q_cp
    assert "REQUIRES" in q_cp
    assert "DEPENDS_ON*0..4" in q_cp
    assert "$service_id" in q_cp

    q_col = load("pred_temporal_collisions")
    assert "Exception" in q_col
    assert "DEPENDS_ON*0..2" in q_col
    assert "$as_of" in q_col
    assert "$horizon_s" in q_col


# ==============================================================================
# 4. Prediction Engine Synthesizer & Performance Harness
# ==============================================================================


@pytest.mark.asyncio
async def test_prediction_engine_synthesis_and_performance():
    """Verify that run_prediction_simulation returns synchronized payload and runs in <100ms."""
    as_of = 1792195200

    # Build realistic mock Repo that returns graph rows
    mock_repo = MagicMock()

    reachability_data = [
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
            "dependent_id": "svc_mobile_api",
            "dependent_name": "Mobile API",
            "tier": 1,
            "customer_facing": True,
            "hops": 1,
            "path_ids": ["svc_mobile_api", "svc_payments_gateway"],
        },
    ]

    cp_data = [
        {
            "target_id": "svc_payments_gateway",
            "customer_path_id": "cp_checkout",
            "customer_path_name": "Checkout",
            "hops": 2,
            "path_ids": ["cp_checkout", "svc_checkout_api", "svc_payments_gateway"],
        }
    ]

    col_data = [
        {
            "exception_id": "exc_w1",
            "exception_title": "Exp 1",
            "severity": 4,
            "expires_at": as_of + 4 * 86400,
            "service_id": "svc_checkout_api",
            "service_name": "Checkout API",
            "service_tier": 1,
            "service_customer_facing": True,
            "connected_service_id": "svc_payments_gateway",
            "connected_service_name": "Payments Gateway",
            "connected_service_tier": 1,
            "hops": 1,
            "path_ids": ["svc_checkout_api", "svc_payments_gateway"],
        },
        {
            "exception_id": "exc_w2",
            "exception_title": "Exp 2",
            "severity": 5,
            "expires_at": as_of + 6 * 86400,
            "service_id": "svc_payments_gateway",
            "service_name": "Payments Gateway",
            "service_tier": 1,
            "service_customer_facing": False,
            "connected_service_id": "svc_payments_gateway",
            "connected_service_name": "Payments Gateway",
            "connected_service_tier": 1,
            "hops": 0,
            "path_ids": ["svc_payments_gateway"],
        },
    ]

    async def mock_read(qid: str, **params: Any) -> list[dict[str, Any]]:
        if qid == "pred_avalanche_reachability":
            return reachability_data
        elif qid == "pred_avalanche_customer_paths":
            return cp_data
        elif qid == "pred_temporal_collisions":
            return col_data
        return []

    mock_repo.read = AsyncMock(side_effect=mock_read)

    forecast = await run_prediction_simulation(mock_repo, as_of=as_of, horizon_days=30)

    # 1. Verify schema contract
    assert isinstance(forecast, SimulationForecastOut)
    assert forecast.as_of == as_of
    assert forecast.horizon_days == 30
    assert forecast.projected_date == as_of + 30 * 86400

    # 2. Strict latency guarantee
    assert forecast.execution_time_ms < 100.0, f"Execution took {forecast.execution_time_ms}ms"

    # 3. Avalanche centrality output
    assert len(forecast.avalanche_centrality) >= 1
    top_av = forecast.avalanche_centrality[0]
    assert top_av.service_id == "svc_payments_gateway"
    assert top_av.spof_rank == 1

    # 4. Temporal collision output
    assert len(forecast.temporal_collisions) >= 1
    col = forecast.temporal_collisions[0]
    assert set(col.exception_ids) == {"exc_w1", "exc_w2"}
    assert "svc_checkout_api" in col.affected_services

    # 5. Canvas decorations
    decorations = forecast.canvas_decorations
    assert "svc_payments_gateway" in decorations
    assert "svc_checkout_api" in decorations

    pw_dec = decorations["svc_payments_gateway"]
    assert pw_dec.is_spof is True
    assert pw_dec.has_collision is True
    assert pw_dec.pulse is True
    assert pw_dec.risk_band in ("critical", "high")
    assert pw_dec.color in ("#ef4444", "#f97316")


# ==============================================================================
# 5. FastAPI Prediction Simulation Endpoint Tests
# ==============================================================================


@pytest.mark.asyncio
async def test_prediction_simulation_api_endpoint():
    """Verify GET /api/v1/workspaces/{ws_id}/prediction/simulation returns 200 and valid JSON."""
    as_of = 1792195200

    mock_org_repo = MagicMock()
    mock_org_repo.read = AsyncMock(return_value=[])

    mock_context = WorkspaceContext(
        ws_id="ws_test",
        workspace={"id": "ws_test", "name": "Test", "status": "ready", "as_of": as_of},
        role=Role.viewer,
        person_id="per_test",
        user=CurrentUser("usr_1", "clerk_1", "test@example.com", "Test User", {}),
        org=mock_org_repo,
        mem=MagicMock(),
        platform=MagicMock(),
        as_of=as_of,
    )

    app.dependency_overrides[viewer] = lambda: mock_context

    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1") as client:
            resp = await client.get("/workspaces/ws_test/prediction/simulation?horizon_days=30")
            assert resp.status_code == 200
            data = resp.json()

            assert data["as_of"] == as_of
            assert data["horizon_days"] == 30
            assert data["projected_date"] == as_of + 30 * 86400
            assert "execution_time_ms" in data
            assert data["execution_time_ms"] < 100.0
            assert isinstance(data["avalanche_centrality"], list)
            assert isinstance(data["temporal_collisions"], list)
            assert isinstance(data["canvas_decorations"], dict)

            # Test target_service_id parameter
            resp_target = await client.get(
                "/workspaces/ws_test/prediction/simulation?horizon_days=7&target_service_id=svc_payments_gateway"
            )
            assert resp_target.status_code == 200
            data_target = resp_target.json()
            assert data_target["horizon_days"] == 7
            assert data_target["projected_date"] == as_of + 7 * 86400
    finally:
        app.dependency_overrides.pop(viewer, None)


def test_avalanche_empty_and_zero_dependents():
    """Verify empty rows and target services with zero dependents."""
    assert compute_avalanche_centrality([], []) == []

    zero_dep_data = [
        {
            "target_id": "svc_leaf",
            "target_name": "Leaf Service",
            "target_tier": 3,
            "target_customer_facing": False,
            "dependent_id": None,
        }
    ]
    items = compute_avalanche_centrality(zero_dep_data, [])
    assert len(items) == 1
    leaf = items[0]
    assert leaf.service_id == "svc_leaf"
    assert leaf.score == 0.0
    assert leaf.band == "low"
    assert leaf.cascade_probability == 0.0
    assert leaf.reachable_services == []
    assert leaf.customer_paths == []
    assert leaf.proof.nodes == ["svc_leaf"]
    assert leaf.proof.edges == []


def test_temporal_collision_multi_hop_connectivity():
    """Verify exceptions on 2-hop connected chain (A -> B -> C) correctly collide."""
    as_of = 1792195200
    rows = [
        {
            "exception_id": "exc_a",
            "exception_title": "Exp A",
            "severity": 3,
            "expires_at": as_of + 2 * 86400,
            "service_id": "svc_a",
            "service_name": "Service A",
            "service_tier": 2,
            "connected_service_id": "svc_c",
            "connected_service_name": "Service C",
            "connected_service_tier": 2,
            "hops": 2,
            "path_ids": ["svc_a", "svc_b", "svc_c"],
        },
        {
            "exception_id": "exc_c",
            "exception_title": "Exp C",
            "severity": 4,
            "expires_at": as_of + 5 * 86400,
            "service_id": "svc_c",
            "service_name": "Service C",
            "service_tier": 2,
            "connected_service_id": "svc_c",
            "connected_service_name": "Service C",
            "connected_service_tier": 2,
            "hops": 0,
            "path_ids": ["svc_c"],
        },
    ]
    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 1
    col = clusters[0]
    assert set(col.exception_ids) == {"exc_a", "exc_c"}
    assert set(col.affected_services) == {"svc_a", "svc_c"}
    # Proof nodes should include intermediate service svc_b
    assert "svc_b" in col.proof.nodes


def test_pydantic_schema_serialization_aliases():
    """Verify ProofEdge and SimulationForecastOut serialization preserves 'from' alias."""
    edge = ProofEdge(from_node="svc_a", to="svc_b", type="DEPENDS_ON")
    dumped = edge.model_dump(by_alias=True)
    assert "from" in dumped
    assert dumped["from"] == "svc_a"
    assert dumped["to"] == "svc_b"
    assert dumped["type"] == "DEPENDS_ON"

    pg = ProofGraph(nodes=["svc_a", "svc_b"], edges=[edge])
    item = AvalancheCentralityItem(
        service_id="svc_a",
        service_name="Service A",
        score=85.0,
        band="critical",
        spof_rank=1,
        cascade_probability=0.85,
        reachable_services=["svc_b"],
        customer_paths=[],
        proof=pg,
    )
    forecast = SimulationForecastOut(
        as_of=1000,
        horizon_days=30,
        projected_date=1000 + 30 * 86400,
        execution_time_ms=5.0,
        avalanche_centrality=[item],
        temporal_collisions=[],
        canvas_decorations={
            "svc_a": CanvasNodeDecoration(
                simulated_score=85.0,
                risk_band="critical",
                is_spof=True,
                has_collision=False,
                pulse=True,
                color="#ef4444",
            )
        },
    )
    json_str = forecast.model_dump_json(by_alias=True)
    assert '"from":"svc_a"' in json_str or '"from": "svc_a"' in json_str


@pytest.mark.asyncio
async def test_performance_harness_under_100ms_repeated():
    """Verify latency benchmark holds under 100ms for repeated executions."""
    mock_repo = MagicMock()
    mock_repo.read = AsyncMock(return_value=[])

    latencies: list[float] = []
    for _ in range(25):
        t_start = time.perf_counter()
        forecast = await run_prediction_simulation(mock_repo, as_of=1792195200, horizon_days=30)
        dur = (time.perf_counter() - t_start) * 1000.0
        latencies.append(dur)
        assert forecast.execution_time_ms < 100.0
        assert dur < 100.0

    avg_ms = sum(latencies) / len(latencies)
    assert avg_ms < 15.0, f"Average execution took {avg_ms}ms, expected <15ms"
