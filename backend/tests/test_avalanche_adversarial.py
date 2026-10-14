"""Adversarial stress and property-based test harness for Avalanche Centrality (Milestone 1).

Conducted by Challenger 1 (Empirical Challenger):
- Numerical stability & boundary conditions (NaN, Inf, ZeroDivisionError, extreme parameters)
- Mathematical invariants & monotonicity (graph expansion, path shortening, multi-path combination)
- Monotonicity bug detection in cascading failure probability
- Customer path cascade probability consistency
- Complex DAG topologies (Diamonds, Deep chains, Bipartite, Random DAGs, Cycles)
- Tier weighting and type resilience
- Performance & latency stress benchmarking (<100ms SLA, <15ms target)
"""

from __future__ import annotations

import math
import random
import time
from typing import Any

import pytest

from app.prediction.avalanche import (
    DEFAULT_P0,
    TIER_WEIGHTS,
    combine_path_probabilities,
    compute_avalanche_centrality,
    compute_path_probability,
)

# ==============================================================================
# 1. Mathematical Oracle & Unit Verification
# ==============================================================================


def oracle_multi_path_prob(hops_list: list[int], p0: float = DEFAULT_P0) -> float:
    """Independent reference implementation of multi-path cascade probability."""
    if not hops_list:
        return 0.0
    no_cascade = 1.0
    for h in hops_list:
        p = 1.0 if h <= 0 else (p0**h)
        no_cascade *= 1.0 - p
    return 1.0 - no_cascade


def test_oracle_equivalence_multi_path():
    """Verify combine_path_probabilities exactly matches mathematical reference."""
    test_cases = [
        [],
        [1],
        [1, 1],
        [1, 2],
        [2, 2, 2],
        [1, 2, 3, 4],
        [4, 4, 4, 4, 4],
        [1] * 10,
    ]
    for hops in test_cases:
        expected = oracle_multi_path_prob(hops, DEFAULT_P0)
        actual = combine_path_probabilities(hops, DEFAULT_P0)
        assert pytest.approx(actual, 1e-9) == expected


def test_multi_path_boundedness_and_monotonicity():
    """Property: P_cascade must be strictly within [0, 1] and non-decreasing with added paths."""
    hops: list[int] = []
    prev_p = 0.0
    for h in [3, 2, 2, 1, 1]:
        hops.append(h)
        p = combine_path_probabilities(hops, DEFAULT_P0)
        assert 0.0 <= p <= 1.0
        assert p >= prev_p, f"Adding path {h} decreased probability from {prev_p} to {p}"
        prev_p = p


# ==============================================================================
# 2. Numerical Stability & Extreme Parameters
# ==============================================================================


def test_numerical_stability_extreme_hops():
    """Check behavior for extreme hops (0, negative, very large)."""
    # 0 hops and negative hops return 1.0
    assert compute_path_probability(0, 0.85) == 1.0
    assert compute_path_probability(-5, 0.85) == 1.0

    # Very large hops decay exponentially without NaN/overflow
    p_100 = compute_path_probability(100, 0.85)
    assert 0.0 <= p_100 <= 1e-6
    assert not math.isnan(p_100)

    p_1000 = compute_path_probability(1000, 0.85)
    assert 0.0 <= p_1000 <= 1e-50
    assert not math.isnan(p_1000)


def test_numerical_stability_p0_boundaries():
    """Check behavior at p0 boundaries: 0.0, 1.0."""
    # p0 = 0.0 (no coupling)
    assert compute_path_probability(1, p0=0.0) == 0.0
    assert combine_path_probabilities([1, 2, 3], p0=0.0) == 0.0

    # p0 = 1.0 (perfect deterministic propagation)
    assert compute_path_probability(1, p0=1.0) == 1.0
    assert compute_path_probability(10, p0=1.0) == 1.0
    assert combine_path_probabilities([1, 2], p0=1.0) == 1.0


def test_division_by_zero_risk_k_avalanche_reproduced():
    """Verify k_avalanche=0.0 does not raise ZeroDivisionError and safely defaults."""
    reachability = [
        {
            "target_id": "svc_target",
            "dependent_id": "svc_dep",
            "hops": 1,
            "path_ids": ["svc_dep", "svc_target"],
        }
    ]
    items = compute_avalanche_centrality(reachability, [], k_avalanche=0.0)
    assert len(items) == 1
    assert not math.isnan(items[0].score)


def test_property_zero_division_guard():
    """Property: Engine must never crash with division by zero when given non-positive k."""
    reachability = [
        {
            "target_id": "svc_target",
            "dependent_id": "svc_dep",
            "hops": 1,
            "path_ids": ["svc_dep", "svc_target"],
        }
    ]
    items = compute_avalanche_centrality(reachability, [], k_avalanche=0.0)
    assert len(items) == 1
    assert not math.isnan(items[0].score)

    items_neg = compute_avalanche_centrality(reachability, [], k_avalanche=-5.0)
    assert len(items_neg) == 1
    assert not math.isnan(items_neg[0].score)


def test_large_raw_ac_no_overflow():
    """Ensure extremely large raw_ac saturates cleanly to 100.0 without overflow."""
    reachability = [
        {
            "target_id": "svc_mega_hub",
            "dependent_id": f"svc_dep_{i}",
            "tier": 1,
            "customer_facing": True,
            "hops": 1,
            "path_ids": [f"svc_dep_{i}", "svc_mega_hub"],
        }
        for i in range(500)
    ]
    items = compute_avalanche_centrality(reachability, [])
    assert len(items) == 1
    top = items[0]
    assert top.score == 100.0
    assert top.band == "critical"
    assert not math.isnan(top.score)
    assert not math.isnan(top.cascade_probability)
    assert top.cascade_probability == 1.0


# ==============================================================================
# 3. Adversarial Bug Detection: Cascading Probability Anomalies
# ==============================================================================


def test_adversarial_cascade_probability_monotonicity_bug_demonstration():
    """Verify adding a direct dependent to multi-hop dependents preserves monotonicity."""
    reachability_a = [
        {
            "target_id": "svc_target",
            "dependent_id": f"svc_dep_{i}",
            "hops": 2,
            "path_ids": [f"svc_dep_{i}", "svc_mid", "svc_target"],
        }
        for i in range(5)
    ]
    items_a = compute_avalanche_centrality(reachability_a, [])
    prob_a = items_a[0].cascade_probability
    assert prob_a == 1.0

    # Add 1 direct dependent
    reachability_b = reachability_a + [
        {
            "target_id": "svc_target",
            "dependent_id": "svc_dep_direct",
            "hops": 1,
            "path_ids": ["svc_dep_direct", "svc_target"],
        }
    ]
    items_b = compute_avalanche_centrality(reachability_b, [])
    prob_b = items_b[0].cascade_probability

    # Monotonicity holds: adding a dependent never reduces cascade probability
    assert prob_b >= prob_a


def test_property_monotonic_cascade_probability():
    """Property: P_cascade must be monotonic under graph expansion."""
    reachability_a = [
        {
            "target_id": "svc_target",
            "dependent_id": f"svc_dep_{i}",
            "hops": 2,
            "path_ids": [f"svc_dep_{i}", "svc_mid", "svc_target"],
        }
        for i in range(5)
    ]
    prob_a = compute_avalanche_centrality(reachability_a, [])[0].cascade_probability

    reachability_b = reachability_a + [
        {
            "target_id": "svc_target",
            "dependent_id": "svc_dep_direct",
            "hops": 1,
            "path_ids": ["svc_dep_direct", "svc_target"],
        }
    ]
    prob_b = compute_avalanche_centrality(reachability_b, [])[0].cascade_probability

    # Monotonicity holds across all graph expansions
    assert prob_b >= prob_a, f"Expected prob_b ({prob_b}) >= prob_a ({prob_a})"


def test_adversarial_customer_paths_cascade_probability_blindspot_demonstration():
    """Verify ingress services powering customer paths receive valid cascade probability."""
    reachability = [
        {
            "target_id": "svc_edge_gateway",
            "target_name": "Edge Gateway",
            "target_tier": 1,
            "target_customer_facing": True,
            "dependent_id": None,
        }
    ]
    customer_paths = [
        {
            "target_id": "svc_edge_gateway",
            "customer_path_id": f"cp_flow_{i}",
            "customer_path_name": f"Customer Flow {i}",
            "hops": 1,
            "path_ids": [f"cp_flow_{i}", "svc_edge_gateway"],
        }
        for i in range(5)
    ]
    items = compute_avalanche_centrality(reachability, customer_paths)
    edge_item = items[0]

    assert edge_item.score >= 90.0
    assert edge_item.band == "critical"
    # Ingress service powering customer paths has non-zero cascade probability
    assert edge_item.cascade_probability > 0.0


def test_property_customer_paths_cascade_probability():
    """Property: A service powering customer paths must have non-zero cascade probability."""
    reachability = [
        {
            "target_id": "svc_edge_gateway",
            "target_name": "Edge Gateway",
            "target_tier": 1,
            "target_customer_facing": True,
            "dependent_id": None,
        }
    ]
    customer_paths = [
        {
            "target_id": "svc_edge_gateway",
            "customer_path_id": "cp_checkout",
            "hops": 1,
            "path_ids": ["cp_checkout", "svc_edge_gateway"],
        }
    ]
    edge_item = compute_avalanche_centrality(reachability, customer_paths)[0]
    assert edge_item.cascade_probability > 0.0


def test_adversarial_customer_paths_without_reachability_dropped():
    """Verify target present only in customer_path_rows is included in computed targets."""
    reachability: list[dict[str, Any]] = []
    customer_paths = [
        {
            "target_id": "svc_only_in_cp",
            "customer_path_id": "cp_main",
            "hops": 1,
            "path_ids": ["cp_main", "svc_only_in_cp"],
        }
    ]
    items = compute_avalanche_centrality(reachability, customer_paths)
    assert len(items) == 1
    assert items[0].service_id == "svc_only_in_cp"
    assert items[0].customer_paths == ["cp_main"]


# ==============================================================================
# 4. Complex DAGs: Diamonds, Chains, Bipartite, and Random Graphs
# ==============================================================================


def test_complex_dag_diamond_lattice():
    """Test Diamond Lattice topology: A -> {B1..Bk} -> C."""
    k = 20
    reachability = []
    for i in range(k):
        reachability.append(
            {
                "target_id": "svc_c",
                "dependent_id": f"svc_b_{i}",
                "tier": 2,
                "hops": 1,
                "path_ids": [f"svc_b_{i}", "svc_c"],
            }
        )
    for i in range(k):
        reachability.append(
            {
                "target_id": "svc_c",
                "dependent_id": "svc_a",
                "tier": 1,
                "customer_facing": True,
                "hops": 2,
                "path_ids": ["svc_a", f"svc_b_{i}", "svc_c"],
            }
        )

    items = compute_avalanche_centrality(reachability, [])
    assert len(items) == 1
    top = items[0]
    assert top.service_id == "svc_c"
    assert top.spof_rank == 1
    assert 0.0 <= top.score <= 100.0
    assert 0.0 <= top.cascade_probability <= 1.0
    assert "svc_c" in top.proof.nodes
    assert "svc_a" in top.proof.nodes
    assert len(top.reachable_services) == k + 1


def test_complex_dag_deep_linear_chain():
    """Test deep linear chain: S_1 -> S_2 -> ... -> S_20 -> Target."""
    chain_len = 20
    reachability = []
    for i in range(1, chain_len + 1):
        hops = chain_len - i + 1
        path = [f"svc_{j}" for j in range(i, chain_len + 1)] + ["svc_target"]
        reachability.append(
            {
                "target_id": "svc_target",
                "dependent_id": f"svc_{i}",
                "tier": 2,
                "hops": hops,
                "path_ids": path,
            }
        )

    items = compute_avalanche_centrality(reachability, [])
    assert len(items) == 1
    top = items[0]
    assert top.service_id == "svc_target"
    assert len(top.reachable_services) == chain_len
    assert top.score > 50.0
    assert not math.isnan(top.score)


def test_complex_dag_cyclic_data_handling():
    """Test data containing circular dependency references (A -> B -> A)."""
    reachability = [
        {
            "target_id": "svc_a",
            "dependent_id": "svc_b",
            "tier": 2,
            "hops": 1,
            "path_ids": ["svc_b", "svc_a"],
        },
        {
            "target_id": "svc_b",
            "dependent_id": "svc_a",
            "tier": 2,
            "hops": 1,
            "path_ids": ["svc_a", "svc_b"],
        },
    ]
    items = compute_avalanche_centrality(reachability, [])
    assert len(items) == 2
    for item in items:
        assert 0.0 <= item.score <= 100.0
        assert not math.isnan(item.score)


# ==============================================================================
# 5. Type Resilience & Tier Weighting Edge Cases
# ==============================================================================


def test_tier_weighting_values():
    """Verify tier criticality weighting values and customer-facing boost."""
    assert TIER_WEIGHTS[1] == 3.0
    assert TIER_WEIGHTS[2] == 2.0
    assert TIER_WEIGHTS[3] == 1.0


def test_tier_string_type_downgrade_demonstration():
    """Check what happens when tier is passed as string '1' instead of int 1.
    In TIER_WEIGHTS.get(tier, 1.0):
    Because keys are ints (1, 2, 3), TIER_WEIGHTS.get('1', 1.0) returns default 1.0!
    """
    row_int = [
        {
            "target_id": "svc_target",
            "dependent_id": "svc_dep",
            "tier": 1,
            "hops": 1,
            "path_ids": ["svc_dep", "svc_target"],
        }
    ]
    row_str = [
        {
            "target_id": "svc_target",
            "dependent_id": "svc_dep",
            "tier": "1",
            "hops": 1,
            "path_ids": ["svc_dep", "svc_target"],
        }
    ]
    score_int = compute_avalanche_centrality(row_int, [])[0].score
    score_str = compute_avalanche_centrality(row_str, [])[0].score

    # String '1' is coerced to int and produces identical score
    assert score_str == score_int


def test_property_tier_string_coercion():
    """Property: String representation of tier should have identical effect as integer."""
    row_int = [
        {
            "target_id": "svc_target",
            "dependent_id": "svc_dep",
            "tier": 1,
            "hops": 1,
            "path_ids": ["svc_dep", "svc_target"],
        }
    ]
    row_str = [
        {
            "target_id": "svc_target",
            "dependent_id": "svc_dep",
            "tier": "1",
            "hops": 1,
            "path_ids": ["svc_dep", "svc_target"],
        }
    ]
    score_int = compute_avalanche_centrality(row_int, [])[0].score
    score_str = compute_avalanche_centrality(row_str, [])[0].score
    assert score_str == score_int


# ==============================================================================
# 6. Performance & Latency Stress Testing (<100ms SLA)
# ==============================================================================


def generate_enterprise_scale_workload(
    num_services: int = 100,
    num_targets: int = 30,
    paths_per_target: int = 25,
    customer_paths_count: int = 20,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Generate realistic large-scale enterprise graph query output rows."""
    rng = random.Random(42)
    service_ids = [f"svc_{i:04d}" for i in range(num_services)]
    target_ids = rng.sample(service_ids, min(num_targets, num_services))

    reachability_rows: list[dict[str, Any]] = []
    for tid in target_ids:
        other_svcs = [s for s in service_ids if s != tid]
        deps = rng.sample(other_svcs, min(paths_per_target, len(other_svcs)))
        for dep in deps:
            hops = rng.randint(1, 4)
            path_ids = [dep]
            for h in range(hops - 1):
                path_ids.append(f"svc_mid_{tid}_{dep}_{h}")
            path_ids.append(tid)

            reachability_rows.append(
                {
                    "target_id": tid,
                    "target_name": f"Service {tid}",
                    "target_tier": rng.choice([1, 2, 3]),
                    "target_customer_facing": rng.choice([True, False]),
                    "dependent_id": dep,
                    "dependent_name": f"Service {dep}",
                    "tier": rng.choice([1, 2, 3]),
                    "customer_facing": rng.choice([True, False]),
                    "hops": hops,
                    "path_ids": path_ids,
                }
            )

    customer_path_rows: list[dict[str, Any]] = []
    for i in range(customer_paths_count):
        cpid = f"cp_{i:03d}"
        tid = rng.choice(target_ids)
        hops = rng.randint(1, 4)
        path_ids = [cpid]
        for h in range(hops - 1):
            path_ids.append(f"svc_cp_mid_{i}_{h}")
        path_ids.append(tid)
        customer_path_rows.append(
            {
                "target_id": tid,
                "customer_path_id": cpid,
                "customer_path_name": f"Customer Journey {i}",
                "hops": hops,
                "path_ids": path_ids,
            }
        )

    return reachability_rows, customer_path_rows


def test_performance_stress_scale_and_sla():
    """Verify latency strictly satisfies <100ms SLA and <15ms target on standard enterprise graph."""
    reachability, customer_paths = generate_enterprise_scale_workload(
        num_services=100,
        num_targets=30,
        paths_per_target=25,
        customer_paths_count=20,
    )
    assert len(reachability) == 750
    assert len(customer_paths) == 20

    # Warm-up run
    compute_avalanche_centrality(reachability, customer_paths)

    latencies: list[float] = []
    for _ in range(25):
        t0 = time.perf_counter()
        results = compute_avalanche_centrality(reachability, customer_paths)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(elapsed_ms)

        assert len(results) == 30
        assert results[0].spof_rank == 1
        assert results[-1].spof_rank == 30

    min_ms = min(latencies)
    max_ms = max(latencies)
    avg_ms = sum(latencies) / len(latencies)
    p95_ms = sorted(latencies)[int(len(latencies) * 0.95)]

    print(
        f"\n[PERFORMANCE BENCHMARK] Workload: 750 reachability paths, 30 targets\n"
        f"  Min: {min_ms:.2f}ms\n"
        f"  Max: {max_ms:.2f}ms\n"
        f"  Avg: {avg_ms:.2f}ms\n"
        f"  P95: {p95_ms:.2f}ms\n"
    )

    # Hard SLA assertions
    assert max_ms < 100.0, f"Max latency exceeded 100ms SLA: {max_ms:.2f}ms"
    assert avg_ms < 15.0, f"Average latency exceeded 15ms target: {avg_ms:.2f}ms"
