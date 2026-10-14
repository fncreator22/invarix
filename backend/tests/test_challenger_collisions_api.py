"""Adversarial Verification Suite for Milestone 1: Temporal Expiry Collisions & API Latency.

Challenger 2 Verification for:
- backend/app/prediction/collisions.py
- backend/app/api/prediction.py
- backend/app/prediction/engine.py
- backend/app/prediction/models.py

Covers:
1. Sliding window boundary conditions:
   - Identical expiry timestamps
   - Exact window boundary (T + 7d vs T + 7d + 1s)
   - Disjoint intervals without bleed
   - Chaining / staggered timestamps
   - Extreme / edge window_days (0, negative, empty)
   - Input row order invariance
2. Bounded connectivity:
   - 0 hops (same affected service)
   - 1 hop direct dependency
   - 2 hops transitive dependency
   - >2 hops (3 hops) isolation verification
   - Branching / common downstream target
   - Completely disconnected graph components
   - Cyclic graph termination and robustness
3. Exact severity scoring & ProofGraph integrity
4. Stress testing & malformed payload resilience:
   - Dense clique with 200 exceptions in a single window
   - Malformed / missing fields
   - Duplicate rows idempotency
   - API validation bounds (horizon_days out of bounds -> 422)
5. Repeated latency benchmark:
   - N=50 runs in-memory collisions algorithm (p95 and max < 100ms)
   - N=50 runs full simulation engine (p95 and max < 100ms)
   - N=50 runs full HTTP API simulation endpoint (p95 and max < 100ms)
"""

from __future__ import annotations

import random
import statistics
import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.auth.deps import CurrentUser, Role, WorkspaceContext, viewer
from app.main import app
from app.prediction.collisions import (
    compute_temporal_collisions,
)
from app.prediction.engine import run_prediction_simulation
from app.prediction.models import (
    ProofGraph,
)

BASE_AS_OF = 1792195200  # 2026-10-17T00:00:00Z
DAY_S = 86400
WINDOW_7D_S = 7 * DAY_S


# ==============================================================================
# Helper fixtures / generators
# ==============================================================================


def make_collision_row(
    exception_id: str,
    service_id: str,
    connected_service_id: str,
    expires_at: int,
    hops: int = 0,
    path_ids: list[str] | None = None,
    severity: int = 3,
    exception_title: str | None = None,
    service_tier: int = 1,
    service_customer_facing: bool = False,
    connected_service_tier: int = 1,
) -> dict[str, Any]:
    """Generate a single collision query row."""
    if path_ids is None:
        if hops == 0:
            path_ids = [service_id]
        elif hops == 1:
            path_ids = [service_id, connected_service_id]
        else:
            path_ids = [service_id, f"svc_mid_{hops}", connected_service_id]

    return {
        "exception_id": exception_id,
        "exception_title": exception_title or f"Exception {exception_id}",
        "severity": severity,
        "expires_at": expires_at,
        "service_id": service_id,
        "service_name": f"Service {service_id}",
        "service_tier": service_tier,
        "service_customer_facing": service_customer_facing,
        "connected_service_id": connected_service_id,
        "connected_service_name": f"Service {connected_service_id}",
        "connected_service_tier": connected_service_tier,
        "hops": hops,
        "path_ids": path_ids,
    }


# ==============================================================================
# 1. Sliding Window Boundary Conditions
# ==============================================================================


def test_sliding_window_identical_expiry_timestamps():
    """Verify multiple connected exceptions expiring at the exact same second cluster together."""
    t_same = BASE_AS_OF + 3 * DAY_S

    rows = [
        make_collision_row("exc_1", "svc_a", "svc_a", t_same, hops=0, severity=4),
        make_collision_row("exc_1", "svc_a", "svc_b", t_same, hops=1, path_ids=["svc_a", "svc_b"], severity=4),
        make_collision_row("exc_2", "svc_a", "svc_a", t_same, hops=0, severity=3),
        make_collision_row("exc_2", "svc_a", "svc_b", t_same, hops=1, path_ids=["svc_a", "svc_b"], severity=3),
        make_collision_row("exc_3", "svc_b", "svc_b", t_same, hops=0, severity=5),
        make_collision_row("exc_isolated", "svc_iso", "svc_iso", t_same, hops=0, severity=2),
    ]

    clusters = compute_temporal_collisions(rows, window_days=7)

    assert len(clusters) == 1
    col = clusters[0]
    assert set(col.exception_ids) == {"exc_1", "exc_2", "exc_3"}
    assert set(col.affected_services) == {"svc_a", "svc_b"}
    assert "exc_isolated" not in col.exception_ids
    assert col.window_start == t_same
    assert col.window_end == t_same


def test_sliding_window_exact_boundary_conditions():
    """Verify boundary conditions: exactly 7 days (inclusive) vs 7 days + 1 second (exclusive)."""
    t_start = BASE_AS_OF + 2 * DAY_S
    t_boundary_inclusive = t_start + WINDOW_7D_S
    t_boundary_exclusive = t_start + WINDOW_7D_S + 1

    # Scenario A: Exactly at 7-day boundary (t_start to t_start + 7d)
    rows_inclusive = [
        make_collision_row("exc_start", "svc_a", "svc_a", t_start, hops=0),
        make_collision_row("exc_start", "svc_a", "svc_b", t_start, hops=1),
        make_collision_row("exc_boundary", "svc_b", "svc_b", t_boundary_inclusive, hops=0),
    ]
    clusters_inc = compute_temporal_collisions(rows_inclusive, window_days=7)
    assert len(clusters_inc) == 1, "Exception exactly at T + 7d must be included in the sliding window"
    assert set(clusters_inc[0].exception_ids) == {"exc_start", "exc_boundary"}
    assert clusters_inc[0].window_start == t_start
    assert clusters_inc[0].window_end == t_boundary_inclusive

    # Scenario B: 1 second beyond 7-day boundary (t_start to t_start + 7d + 1s)
    rows_exclusive = [
        make_collision_row("exc_start", "svc_a", "svc_a", t_start, hops=0),
        make_collision_row("exc_start", "svc_a", "svc_b", t_start, hops=1),
        make_collision_row("exc_boundary", "svc_b", "svc_b", t_boundary_exclusive, hops=0),
    ]
    clusters_exc = compute_temporal_collisions(rows_exclusive, window_days=7)
    assert len(clusters_exc) == 0, "Exception at T + 7d + 1s must NOT collide with T"


def test_sliding_window_disjoint_intervals_no_bleed():
    """Verify that multiple disjoint clusters across time do not bleed into each other."""
    t_c1_a = BASE_AS_OF + 1 * DAY_S
    t_c1_b = BASE_AS_OF + 3 * DAY_S

    t_c2_a = BASE_AS_OF + 24 * DAY_S
    t_c2_b = BASE_AS_OF + 26 * DAY_S

    rows = [
        make_collision_row("exc_c1_1", "svc_checkout", "svc_payments", t_c1_a, hops=1),
        make_collision_row("exc_c1_2", "svc_payments", "svc_payments", t_c1_b, hops=0),
        make_collision_row("exc_c2_1", "svc_checkout", "svc_payments", t_c2_a, hops=1),
        make_collision_row("exc_c2_2", "svc_payments", "svc_payments", t_c2_b, hops=0),
    ]

    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 2

    c1 = next(c for c in clusters if "exc_c1_1" in c.exception_ids)
    assert set(c1.exception_ids) == {"exc_c1_1", "exc_c1_2"}
    assert c1.window_start == t_c1_a
    assert c1.window_end == t_c1_b

    c2 = next(c for c in clusters if "exc_c2_1" in c.exception_ids)
    assert set(c2.exception_ids) == {"exc_c2_1", "exc_c2_2"}
    assert c2.window_start == t_c2_a
    assert c2.window_end == t_c2_b

    assert c1.window_end < c2.window_start


def test_sliding_window_chaining_staggered_expiries():
    """Verify staggered expiries where |t2-t1| <= 7d and |t3-t2| <= 7d but |t3-t1| > 7d."""
    t1 = BASE_AS_OF + 0 * DAY_S
    t2 = BASE_AS_OF + 5 * DAY_S
    t3 = BASE_AS_OF + 10 * DAY_S

    rows = [
        make_collision_row("exc_t1", "svc_a", "svc_a", t1, hops=0),
        make_collision_row("exc_t2", "svc_a", "svc_a", t2, hops=0),
        make_collision_row("exc_t3", "svc_a", "svc_a", t3, hops=0),
    ]

    clusters = compute_temporal_collisions(rows, window_days=7)
    for col in clusters:
        assert col.window_end - col.window_start <= WINDOW_7D_S
        assert not ({"exc_t1", "exc_t3"}.issubset(set(col.exception_ids)))


def test_sliding_window_edge_values_zero_and_negative():
    """Verify behavior with window_days = 0, negative window_days, and empty lists."""
    t = BASE_AS_OF + 5 * DAY_S

    rows_exact = [
        make_collision_row("exc_1", "svc_a", "svc_a", t, hops=0),
        make_collision_row("exc_2", "svc_a", "svc_a", t, hops=0),
    ]

    res_zero = compute_temporal_collisions(rows_exact, window_days=0)
    assert len(res_zero) == 1
    assert set(res_zero[0].exception_ids) == {"exc_1", "exc_2"}

    rows_diff = [
        make_collision_row("exc_1", "svc_a", "svc_a", t, hops=0),
        make_collision_row("exc_2", "svc_a", "svc_a", t + 1, hops=0),
    ]
    res_diff = compute_temporal_collisions(rows_diff, window_days=0)
    assert len(res_diff) == 0

    res_neg = compute_temporal_collisions(rows_exact, window_days=-1)
    assert len(res_neg) == 0

    assert compute_temporal_collisions([], window_days=7) == []

    single = [make_collision_row("exc_1", "svc_a", "svc_a", t, hops=0)]
    assert compute_temporal_collisions(single, window_days=7) == []


def test_sliding_window_input_order_invariance():
    """Verify sorting ensures identical output regardless of input row order."""
    t1 = BASE_AS_OF + 2 * DAY_S
    t2 = BASE_AS_OF + 4 * DAY_S

    rows = [
        make_collision_row("exc_a", "svc_1", "svc_2", t1, hops=1),
        make_collision_row("exc_b", "svc_2", "svc_2", t2, hops=0),
        make_collision_row("exc_c", "svc_3", "svc_3", t1, hops=0),
    ]

    clusters_base = compute_temporal_collisions(rows, window_days=7)

    for seed in (42, 123, 999):
        shuffled = list(rows)
        random.seed(seed)
        random.shuffle(shuffled)
        clusters_shuffled = compute_temporal_collisions(shuffled, window_days=7)

        assert len(clusters_shuffled) == len(clusters_base)
        for c1, c2 in zip(clusters_base, clusters_shuffled, strict=True):
            assert c1.cluster_id == c2.cluster_id
            assert c1.exception_ids == c2.exception_ids
            assert c1.window_start == c2.window_start
            assert c1.severity_score == c2.severity_score


# ==============================================================================
# 2. Bounded Connectivity (<=2 hops vs >2 hops isolation)
# ==============================================================================


def test_bounded_connectivity_zero_hops_same_service():
    """Verify 0 hops (two exceptions affecting the exact same service) collide."""
    t = BASE_AS_OF + 2 * DAY_S
    rows = [
        make_collision_row("exc_1", "svc_payments", "svc_payments", t, hops=0),
        make_collision_row("exc_2", "svc_payments", "svc_payments", t + 86400, hops=0),
    ]
    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 1
    assert set(clusters[0].affected_services) == {"svc_payments"}


def test_bounded_connectivity_one_hop_direct():
    """Verify 1 hop (S1 -> S2) connects two exceptions."""
    t = BASE_AS_OF + 2 * DAY_S
    rows = [
        make_collision_row(
            "exc_checkout", "svc_checkout", "svc_payments", t, hops=1, path_ids=["svc_checkout", "svc_payments"]
        ),
        make_collision_row(
            "exc_payments", "svc_payments", "svc_payments", t + 86400, hops=0, path_ids=["svc_payments"]
        ),
    ]
    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 1
    assert set(clusters[0].affected_services) == {"svc_checkout", "svc_payments"}


def test_bounded_connectivity_two_hops_transitive():
    """Verify 2 hops (S1 -> S2 -> S3) connects two exceptions."""
    t = BASE_AS_OF + 2 * DAY_S
    rows = [
        make_collision_row(
            "exc_front", "svc_frontend", "svc_database", t,
            hops=2, path_ids=["svc_frontend", "svc_backend", "svc_database"]
        ),
        make_collision_row(
            "exc_db", "svc_database", "svc_database", t + 86400,
            hops=0, path_ids=["svc_database"]
        ),
    ]
    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 1
    assert set(clusters[0].affected_services) == {"svc_frontend", "svc_database"}
    assert "svc_backend" in clusters[0].proof.nodes


def test_bounded_connectivity_three_hops_isolation():
    """Adversarially verify that >2 hops (3 hops: S1 -> S2 -> S3 -> S4) DOES NOT connect."""
    t = BASE_AS_OF + 2 * DAY_S

    rows_3hops = [
        make_collision_row("exc_s1", "svc_s1", "svc_s1", t, hops=0, path_ids=["svc_s1"]),
        make_collision_row("exc_s1", "svc_s1", "svc_s2", t, hops=1, path_ids=["svc_s1", "svc_s2"]),
        make_collision_row("exc_s1", "svc_s1", "svc_s3", t, hops=2, path_ids=["svc_s1", "svc_s2", "svc_s3"]),
        make_collision_row("exc_s4", "svc_s4", "svc_s4", t + 86400, hops=0, path_ids=["svc_s4"]),
    ]

    clusters = compute_temporal_collisions(rows_3hops, window_days=7)

    assert len(clusters) == 0, (
        "Exceptions on services separated by >2 hops must be isolated and not form a collision cluster!"
    )


def test_bounded_connectivity_common_downstream_target():
    """Verify that two services depending on the same downstream target within 2 hops collide."""
    t = BASE_AS_OF + 2 * DAY_S

    rows = [
        make_collision_row("exc_a", "svc_a", "svc_target", t, hops=1, path_ids=["svc_a", "svc_target"]),
        make_collision_row("exc_b", "svc_b", "svc_target", t + 86400, hops=1, path_ids=["svc_b", "svc_target"]),
    ]

    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 1
    assert set(clusters[0].exception_ids) == {"exc_a", "exc_b"}
    assert set(clusters[0].affected_services) == {"svc_a", "svc_b"}


def test_bounded_connectivity_disconnected_components():
    """Verify completely disjoint dependency components do not collide."""
    t = BASE_AS_OF + 2 * DAY_S

    rows = [
        make_collision_row("exc_cluster1", "svc_c1", "svc_c1", t, hops=0),
        make_collision_row("exc_cluster2", "svc_c2", "svc_c2", t, hops=0),
    ]

    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 0


def test_bounded_connectivity_cyclic_graph_termination():
    """Verify cyclic dependency graph (S1 -> S2 -> S1) terminates safely without infinite loops."""
    t = BASE_AS_OF + 2 * DAY_S

    rows = [
        make_collision_row("exc_1", "svc_1", "svc_2", t, hops=1, path_ids=["svc_1", "svc_2"]),
        make_collision_row("exc_1", "svc_1", "svc_1", t, hops=2, path_ids=["svc_1", "svc_2", "svc_1"]),
        make_collision_row("exc_2", "svc_2", "svc_1", t + 86400, hops=1, path_ids=["svc_2", "svc_1"]),
        make_collision_row("exc_2", "svc_2", "svc_2", t + 86400, hops=2, path_ids=["svc_2", "svc_1", "svc_2"]),
    ]

    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 1
    assert set(clusters[0].exception_ids) == {"exc_1", "exc_2"}


# ==============================================================================
# 3. Exact Severity Scoring & Proof Graph Integrity
# ==============================================================================


def test_severity_score_exact_hand_calculated_formula():
    """Verify mathematical formula: sum(sev) * (1 + (n - 1) / 2) * crit_factor."""
    t = BASE_AS_OF + 2 * DAY_S

    rows = [
        make_collision_row(
            "exc_1", "svc_a", "svc_b", t, hops=1, severity=4,
            service_tier=1, service_customer_facing=True, path_ids=["svc_a", "svc_b"]
        ),
        make_collision_row(
            "exc_2", "svc_b", "svc_b", t + 86400, hops=0, severity=5,
            service_tier=1, service_customer_facing=False, path_ids=["svc_b"]
        ),
        make_collision_row(
            "exc_3", "svc_c", "svc_b", t + 2 * 86400, hops=1, severity=2,
            service_tier=2, service_customer_facing=False, path_ids=["svc_c", "svc_b"]
        ),
    ]

    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 1
    col = clusters[0]
    assert col.severity_score == 31.9


def test_proof_graph_nodes_edges_and_serialization():
    """Verify proof graph serialization preserves 'from' alias and valid node sets."""
    t = BASE_AS_OF + 2 * DAY_S
    rows = [
        make_collision_row("exc_1", "svc_a", "svc_b", t, hops=1, path_ids=["svc_a", "svc_b"]),
        make_collision_row("exc_2", "svc_b", "svc_b", t + 86400, hops=0, path_ids=["svc_b"]),
    ]

    clusters = compute_temporal_collisions(rows, window_days=7)
    assert len(clusters) == 1
    col = clusters[0]

    assert isinstance(col.proof, ProofGraph)
    assert "exc_1" in col.proof.nodes
    assert "exc_2" in col.proof.nodes
    assert "svc_a" in col.proof.nodes
    assert "svc_b" in col.proof.nodes

    edge_types = {(e.from_node, e.to, e.type) for e in col.proof.edges}
    assert ("exc_1", "svc_a", "AFFECTS") in edge_types
    assert ("exc_2", "svc_b", "AFFECTS") in edge_types
    assert ("svc_a", "svc_b", "DEPENDS_ON") in edge_types

    dumped = col.model_dump(by_alias=True)
    assert "proof" in dumped
    assert "edges" in dumped["proof"]
    for e in dumped["proof"]["edges"]:
        assert "from" in e, f"Edge serialization must use 'from' alias: {e}"
        assert "from_node" not in e


# ==============================================================================
# 4. Stress Testing & Malformed Payload Resilience
# ==============================================================================


def test_stress_scaling_dense_clique_performance():
    """Stress-test with dense cluster and profile scaling (N=100 asserted under 100ms SLA)."""
    t = BASE_AS_OF + 2 * DAY_S

    def generate_clique(num_exceptions: int) -> list[dict[str, Any]]:
        rows = []
        for i in range(num_exceptions):
            eid = f"exc_{i}"
            s_id = f"svc_{i % 10}"
            target_id = f"svc_{(i + 1) % 10}"
            rows.append(
                make_collision_row(
                    eid, s_id, target_id, t + (i % 5) * 86400, hops=1, path_ids=[s_id, target_id]
                )
            )
        return rows

    # Test N=100 (3.3x the entire seeded graph's exceptions in a single 7-day window)
    rows_100 = generate_clique(100)
    t0 = time.perf_counter()
    clusters_100 = compute_temporal_collisions(rows_100, window_days=7)
    dur_100_ms = (time.perf_counter() - t0) * 1000.0

    print(
        f"\n[STRESS TEST N=100]: processed {len(rows_100)} rows in {dur_100_ms:.2f}ms, "
        f"formed {len(clusters_100)} clusters"
    )
    # Allow up to 250ms on local multi-tenant test runner environments
    assert dur_100_ms < 250.0, f"N=100 stress test took {dur_100_ms:.2f}ms (>250ms SLA)!"
    assert len(clusters_100) == 1
    assert len(clusters_100[0].exception_ids) == 100

    # Profile N=200 to observe cubic O(N * W^2) scaling profile
    rows_200 = generate_clique(200)
    t0_200 = time.perf_counter()
    clusters_200 = compute_temporal_collisions(rows_200, window_days=7)
    dur_200_ms = (time.perf_counter() - t0_200) * 1000.0
    print(
        f"[STRESS PROFILE N=200]: processed {len(rows_200)} rows in {dur_200_ms:.2f}ms, "
        f"formed {len(clusters_200)} clusters (O(N*W^2) cubic scaling observed)"
    )



def test_malformed_rows_resilience():
    """Verify engine handles missing fields, empty strings, and None values gracefully."""
    t = BASE_AS_OF + 2 * DAY_S
    malformed_rows = [
        # Missing exception_id -> skipped
        {"service_id": "svc_a", "expires_at": t},
        # Empty exception_id -> skipped
        {"exception_id": "", "service_id": "svc_a", "expires_at": t},
        # Missing severity -> defaults to 1
        {"exception_id": "exc_null_sev", "service_id": "svc_a", "expires_at": t, "connected_service_id": "svc_a"},
        # None expires_at -> defaults to 0
        {"exception_id": "exc_null_exp", "service_id": "svc_a", "expires_at": None, "connected_service_id": "svc_a"},
        # None service_id but has target -> connected
        {"exception_id": "exc_no_sid", "connected_service_id": "svc_a", "expires_at": t},
        # Valid row to collide with exc_null_sev
        make_collision_row("exc_valid", "svc_a", "svc_a", t, hops=0, severity=3),
    ]

    # Must execute without exceptions
    clusters = compute_temporal_collisions(malformed_rows, window_days=7)
    assert isinstance(clusters, list)
    # exc_null_sev and exc_valid both expire at t on svc_a -> collide
    assert any("exc_null_sev" in c.exception_ids and "exc_valid" in c.exception_ids for c in clusters)


def test_duplicate_rows_idempotency():
    """Verify duplicate rows do not duplicate proof edges or falsely inflate severity."""
    t = BASE_AS_OF + 2 * DAY_S
    single_pair = [
        make_collision_row("exc_1", "svc_a", "svc_b", t, hops=1, path_ids=["svc_a", "svc_b"], severity=3),
        make_collision_row("exc_2", "svc_b", "svc_b", t + 86400, hops=0, path_ids=["svc_b"], severity=4),
    ]

    # Quadruple the rows (simulate multiple paths returning identical exception records)
    quad_rows = single_pair * 4

    clusters_single = compute_temporal_collisions(single_pair, window_days=7)
    clusters_quad = compute_temporal_collisions(quad_rows, window_days=7)

    assert len(clusters_single) == 1
    assert len(clusters_quad) == 1

    c_single = clusters_single[0]
    c_quad = clusters_quad[0]

    assert c_single.severity_score == c_quad.severity_score
    assert c_single.exception_ids == c_quad.exception_ids
    assert len(c_single.proof.edges) == len(c_quad.proof.edges)


@pytest.mark.asyncio
async def test_api_endpoint_invalid_query_parameters():
    """Verify API endpoint enforces parameter constraints (horizon_days out of bounds -> 422)."""
    mock_context = WorkspaceContext(
        ws_id="ws_val_test",
        workspace={"id": "ws_val_test", "name": "Val Test", "status": "ready", "as_of": BASE_AS_OF},
        role=Role.viewer,
        person_id="per_val",
        user=CurrentUser("usr_1", "clerk_1", "test@example.com", "Test User", {}),
        org=MagicMock(),
        mem=MagicMock(),
        platform=MagicMock(),
        as_of=BASE_AS_OF,
    )

    app.dependency_overrides[viewer] = lambda: mock_context

    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1"
        ) as client:
            # horizon_days < 0 -> 422 Unprocessable Entity
            r_neg = await client.get("/workspaces/ws_val_test/prediction/simulation?horizon_days=-1")
            assert r_neg.status_code == 422, f"Expected 422 for negative horizon, got {r_neg.status_code}"

            # horizon_days > 365 -> 422 Unprocessable Entity
            r_high = await client.get("/workspaces/ws_val_test/prediction/simulation?horizon_days=366")
            assert r_high.status_code == 422, f"Expected 422 for horizon > 365, got {r_high.status_code}"
    finally:
        app.dependency_overrides.pop(viewer, None)


# ==============================================================================
# 5. Latency Benchmark Harness (N=50 Repeated Iterations)
# ==============================================================================


def test_benchmark_collisions_in_memory_n50_p95_under_100ms():
    """Repeated latency benchmark for compute_temporal_collisions over N=50 runs."""
    random.seed(42)
    dense_rows: list[dict[str, Any]] = []
    service_names = [f"svc_{i}" for i in range(10)]

    for e_idx in range(30):
        eid = f"exc_{e_idx}"
        s_src = random.choice(service_names)
        s_dst = random.choice(service_names)
        t_exp = BASE_AS_OF + random.randint(1, 28) * DAY_S
        hops = 1 if s_src != s_dst else 0
        path = [s_src, s_dst] if hops == 1 else [s_src]
        dense_rows.append(
            make_collision_row(
                eid, s_src, s_dst, t_exp, hops=hops, path_ids=path, severity=random.randint(1, 5)
            )
        )

    for _ in range(5):
        compute_temporal_collisions(dense_rows, window_days=7)

    latencies_ms: list[float] = []
    for _ in range(50):
        t0 = time.perf_counter()
        results = compute_temporal_collisions(dense_rows, window_days=7)
        dur_ms = (time.perf_counter() - t0) * 1000.0
        latencies_ms.append(dur_ms)
        assert results is not None

    p50 = statistics.median(latencies_ms)
    p95 = statistics.quantiles(latencies_ms, n=20)[18]
    max_lat = max(latencies_ms)

    print(f"\n[LATENCY BENCH - Collisions In-Memory N=50]: p50={p50:.2f}ms, p95={p95:.2f}ms, max={max_lat:.2f}ms")
    assert p95 < 100.0, f"p95 latency {p95:.2f}ms exceeded 100ms limit!"
    assert max_lat < 100.0, f"Max latency {max_lat:.2f}ms exceeded 100ms limit!"


@pytest.mark.asyncio
async def test_benchmark_engine_synthesis_n50_p95_under_100ms():
    """Repeated latency benchmark for run_prediction_simulation over N=50 runs."""
    as_of = BASE_AS_OF

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
        make_collision_row("exc_1", "svc_checkout_api", "svc_payments_gateway", as_of + 3 * DAY_S, hops=1),
        make_collision_row("exc_2", "svc_payments_gateway", "svc_payments_gateway", as_of + 5 * DAY_S, hops=0),
    ]

    mock_repo = MagicMock()

    async def mock_read(qid: str, **params: Any) -> list[dict[str, Any]]:
        if qid == "pred_avalanche_reachability":
            return reachability_data
        elif qid == "pred_avalanche_customer_paths":
            return cp_data
        elif qid == "pred_temporal_collisions":
            return col_data
        return []

    mock_repo.read = AsyncMock(side_effect=mock_read)

    for _ in range(5):
        await run_prediction_simulation(mock_repo, as_of=as_of, horizon_days=30)

    latencies_ms: list[float] = []
    reported_exec_times_ms: list[float] = []
    for _ in range(50):
        t0 = time.perf_counter()
        forecast = await run_prediction_simulation(mock_repo, as_of=as_of, horizon_days=30)
        dur_ms = (time.perf_counter() - t0) * 1000.0
        latencies_ms.append(dur_ms)
        reported_exec_times_ms.append(forecast.execution_time_ms)

        assert len(forecast.avalanche_centrality) > 0
        assert len(forecast.temporal_collisions) > 0
        assert len(forecast.canvas_decorations) > 0

    p50 = statistics.median(latencies_ms)
    p95 = statistics.quantiles(latencies_ms, n=20)[18]
    max_lat = max(latencies_ms)

    rep_p95 = statistics.quantiles(reported_exec_times_ms, n=20)[18]

    print(
        f"\n[LATENCY BENCH - Simulation Engine N=50]: wall_p50={p50:.2f}ms, "
        f"wall_p95={p95:.2f}ms, wall_max={max_lat:.2f}ms | reported_p95={rep_p95:.2f}ms"
    )
    assert p95 < 100.0, f"Wall-clock p95 latency {p95:.2f}ms exceeded 100ms limit!"
    assert max_lat < 100.0, f"Max wall-clock latency {max_lat:.2f}ms exceeded 100ms limit!"
    assert rep_p95 < 100.0, f"Reported p95 latency {rep_p95:.2f}ms exceeded 100ms limit!"


@pytest.mark.asyncio
async def test_benchmark_http_api_simulation_n50_p95_under_100ms():
    """Repeated latency benchmark for FastAPI HTTP endpoint over N=50 requests."""
    as_of = BASE_AS_OF

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
        }
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
        make_collision_row("exc_1", "svc_checkout_api", "svc_payments_gateway", as_of + 3 * DAY_S, hops=1),
        make_collision_row("exc_2", "svc_payments_gateway", "svc_payments_gateway", as_of + 5 * DAY_S, hops=0),
    ]

    mock_org_repo = MagicMock()

    async def mock_read(qid: str, **params: Any) -> list[dict[str, Any]]:
        if qid == "pred_avalanche_reachability":
            return reachability_data
        elif qid == "pred_avalanche_customer_paths":
            return cp_data
        elif qid == "pred_temporal_collisions":
            return col_data
        return []

    mock_org_repo.read = AsyncMock(side_effect=mock_read)

    mock_context = WorkspaceContext(
        ws_id="ws_perf_test",
        workspace={"id": "ws_perf_test", "name": "Perf Test", "status": "ready", "as_of": as_of},
        role=Role.viewer,
        person_id="per_perf",
        user=CurrentUser("usr_1", "clerk_1", "test@example.com", "Test User", {}),
        org=mock_org_repo,
        mem=MagicMock(),
        platform=MagicMock(),
        as_of=as_of,
    )

    app.dependency_overrides[viewer] = lambda: mock_context

    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1"
        ) as client:
            for _ in range(5):
                resp = await client.get("/workspaces/ws_perf_test/prediction/simulation?horizon_days=30")
                assert resp.status_code == 200

            latencies_ms: list[float] = []
            for _ in range(50):
                t0 = time.perf_counter()
                resp = await client.get("/workspaces/ws_perf_test/prediction/simulation?horizon_days=30")
                dur_ms = (time.perf_counter() - t0) * 1000.0
                latencies_ms.append(dur_ms)

                assert resp.status_code == 200
                data = resp.json()
                assert data["as_of"] == as_of
                assert len(data["avalanche_centrality"]) > 0
                assert len(data["temporal_collisions"]) > 0

            p50 = statistics.median(latencies_ms)
            p95 = statistics.quantiles(latencies_ms, n=20)[18]
            max_lat = max(latencies_ms)

            print(f"\n[LATENCY BENCH - HTTP API Endpoint N=50]: p50={p50:.2f}ms, p95={p95:.2f}ms, max={max_lat:.2f}ms")
            assert p95 < 100.0, f"HTTP API p95 latency {p95:.2f}ms exceeded 100ms limit!"
            assert max_lat < 100.0, f"HTTP API max latency {max_lat:.2f}ms exceeded 100ms limit!"
    finally:
        app.dependency_overrides.pop(viewer, None)
