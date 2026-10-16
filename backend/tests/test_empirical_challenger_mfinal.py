"""Empirical Challenger Final Test Suite (Milestone M-Final).

Adversarial stress-testing of Reprieve mathematical engines:
1. Avalanche Centrality AC(u) under adversarial and degenerate topologies:
   - 0-edge disconnected graphs (empty, single isolated, 50 isolated nodes)
   - Dense cyclic dependency graphs (2-cycles, 3-cycles, 10-node cycles, complete directed cliques)
   - Deep linear dependency chains (h = 16, 20, 50, 100 hops)
   - Large diamond structures with multiple convergent paths (K = 50, 100, 200 paths, nested diamonds)
   - Probability bounded verification ([0, 1] interval, no NaN, Inf, or overflow)
2. Temporal Expiry Collision Dynamics:
   - Cluster sliding window bounding (<= 7 days / 604,800s) under staggered, chained, and adversarial inputs
   - Verification of all 12 combinations of tier, customer-facing, and multi-service criticality factors
   - Mathematical formula precision: sum(sev) * (1 + (n - 1) / 2) * crit_factor
3. Provenance Guardrail guard.py:
   - Substring mutations, real vs fake entity IDs
   - Adversarial formatting (backticks, brackets, punctuation, markdown tables, lists)
   - Detection and empirical documentation of underscore italics boundary behavior
   - 100% pruning accuracy on uncited IDs matching ID_RE
"""

from __future__ import annotations

import math
import random
import re
from typing import Any

import pytest

from app.agents.guard import ground
from app.agents.tools import ID_RE, LABEL_OF
from app.prediction.avalanche import (
    DEFAULT_K_AVALANCHE,
    DEFAULT_P0,
    TIER_WEIGHTS,
    band,
    combine_path_probabilities,
    compute_avalanche_centrality,
    compute_path_probability,
)
from app.prediction.collisions import (
    compute_temporal_collisions,
)

BASE_AS_OF = 1792195200  # 2026-10-17T00:00:00Z
DAY_S = 86400
WINDOW_7D_S = 7 * DAY_S


# ==============================================================================
# SECTION 1: Avalanche Centrality Under Adversarial & Degenerate Topologies
# ==============================================================================


class TestAvalancheCentralityDegenerateTopologies:
    """Empirical challenge tests for 0-edge, cyclic, deep chain, and diamond graphs."""

    def test_zero_edge_empty_graph(self):
        """0-edge degenerate case: completely empty reachability and customer paths."""
        items = compute_avalanche_centrality([], [])
        assert items == []

    def test_zero_edge_single_isolated_service(self):
        """0-edge degenerate case: single service with 0 dependents and 0 customer paths."""
        reachability = [
            {
                "target_id": "svc_isolated",
                "target_name": "Isolated Service",
                "target_tier": 2,
                "target_customer_facing": False,
                "dependent_id": None,
            }
        ]
        items = compute_avalanche_centrality(reachability, [])
        assert len(items) == 1
        item = items[0]
        assert item.service_id == "svc_isolated"
        assert item.score == 0.0
        assert item.band == "low"
        assert item.cascade_probability == 0.0
        assert item.reachable_services == []
        assert item.customer_paths == []
        assert item.proof.nodes == ["svc_isolated"]
        assert item.proof.edges == []
        assert not math.isnan(item.score)
        assert not math.isinf(item.score)
        assert not math.isnan(item.cascade_probability)

    def test_zero_edge_fifty_disconnected_services(self):
        """0-edge degenerate case: 50 completely disconnected services."""
        reachability = [
            {
                "target_id": f"svc_iso_{i:02d}",
                "target_name": f"Isolated {i:02d}",
                "target_tier": (i % 3) + 1,
                "target_customer_facing": (i % 2 == 0),
                "dependent_id": None,
            }
            for i in range(50)
        ]
        items = compute_avalanche_centrality(reachability, [])
        assert len(items) == 50
        for rank, item in enumerate(items, start=1):
            assert item.score == 0.0
            assert item.band == "low"
            assert item.cascade_probability == 0.0
            assert item.spof_rank == rank
            assert item.reachable_services == []
            assert item.customer_paths == []
            assert item.proof.edges == []
            assert 0.0 <= item.cascade_probability <= 1.0

    def test_dense_cyclic_two_node_mutual_dependency(self):
        """Cyclic topology: A -> DEPENDS_ON -> B and B -> DEPENDS_ON -> A."""
        reachability = [
            {
                "target_id": "svc_a",
                "target_name": "Service A",
                "target_tier": 1,
                "dependent_id": "svc_b",
                "dependent_name": "Service B",
                "tier": 1,
                "hops": 1,
                "path_ids": ["svc_b", "svc_a"],
            },
            {
                "target_id": "svc_b",
                "target_name": "Service B",
                "target_tier": 1,
                "dependent_id": "svc_a",
                "dependent_name": "Service A",
                "tier": 1,
                "hops": 1,
                "path_ids": ["svc_a", "svc_b"],
            },
        ]
        items = compute_avalanche_centrality(reachability, [])
        assert len(items) == 2
        for item in items:
            assert 0.0 <= item.score <= 100.0
            assert 0.0 <= item.cascade_probability <= 1.0
            assert not math.isnan(item.score)
            assert not math.isnan(item.cascade_probability)
            assert len(item.proof.edges) >= 1
            # Verify proof edges endpoints exist in proof nodes
            for edge in item.proof.edges:
                assert edge.from_node in item.proof.nodes
                assert edge.to in item.proof.nodes

    def test_dense_cyclic_three_node_directed_cycle(self):
        """Cyclic topology: A -> B -> C -> A (each service depends on predecessor)."""
        reachability = [
            # A has dependent C (hops 1: C -> A) and B (hops 2: B -> C -> A)
            {"target_id": "svc_a", "dependent_id": "svc_c", "tier": 1, "hops": 1, "path_ids": ["svc_c", "svc_a"]},
            {"target_id": "svc_a", "dependent_id": "svc_b", "tier": 1, "hops": 2, "path_ids": ["svc_b", "svc_c", "svc_a"]},
            # B has dependent A (hops 1: A -> B) and C (hops 2: C -> A -> B)
            {"target_id": "svc_b", "dependent_id": "svc_a", "tier": 1, "hops": 1, "path_ids": ["svc_a", "svc_b"]},
            {"target_id": "svc_b", "dependent_id": "svc_c", "tier": 1, "hops": 2, "path_ids": ["svc_c", "svc_a", "svc_b"]},
            # C has dependent B (hops 1: B -> C) and A (hops 2: A -> B -> C)
            {"target_id": "svc_c", "dependent_id": "svc_b", "tier": 1, "hops": 1, "path_ids": ["svc_b", "svc_c"]},
            {"target_id": "svc_c", "dependent_id": "svc_a", "tier": 1, "hops": 2, "path_ids": ["svc_a", "svc_b", "svc_c"]},
        ]
        items = compute_avalanche_centrality(reachability, [])
        assert len(items) == 3
        # By symmetry, all scores and cascade probabilities must be identical
        scores = [it.score for it in items]
        cascade_probs = [it.cascade_probability for it in items]
        assert len(set(scores)) == 1
        assert len(set(cascade_probs)) == 1
        assert 0.0 <= scores[0] <= 100.0
        assert 0.0 <= cascade_probs[0] <= 1.0

    def test_dense_cyclic_complete_digraph_clique(self):
        """Adversarial stress: Complete directed graph of N=10 nodes (90 directed edges)."""
        n = 10
        services = [f"svc_clique_{i}" for i in range(n)]
        reachability = []
        for target in services:
            for dep in services:
                if dep == target:
                    continue
                reachability.append(
                    {
                        "target_id": target,
                        "target_name": f"Target {target}",
                        "target_tier": 1,
                        "dependent_id": dep,
                        "dependent_name": f"Dep {dep}",
                        "tier": 1,
                        "hops": 1,
                        "path_ids": [dep, target],
                    }
                )
        items = compute_avalanche_centrality(reachability, [])
        assert len(items) == n
        for item in items:
            assert not math.isnan(item.score)
            assert not math.isnan(item.cascade_probability)
            assert 0.0 <= item.score <= 100.0
            assert 0.0 <= item.cascade_probability <= 1.0
            assert len(item.reachable_services) == n - 1
            assert item.cascade_probability == 1.0  # saturated

    def test_deep_linear_dependency_chain_over_15_hops(self):
        """Deep linear dependency chain where h > 15 hops (tested up to h = 25 hops)."""
        chain_len = 25  # h = 1 to 25 hops
        reachability = []
        for i in range(1, chain_len + 1):
            hops = chain_len - i + 1  # hops ranges from 1 to 25
            path = [f"svc_chain_{j}" for j in range(i, chain_len + 1)] + ["svc_deep_target"]
            reachability.append(
                {
                    "target_id": "svc_deep_target",
                    "target_name": "Deep Target Service",
                    "target_tier": 1,
                    "dependent_id": f"svc_chain_{i}",
                    "dependent_name": f"Chain Service {i}",
                    "tier": 2,
                    "hops": hops,
                    "path_ids": path,
                }
            )

        items = compute_avalanche_centrality(reachability, [])
        assert len(items) == 1
        top = items[0]
        assert top.service_id == "svc_deep_target"
        assert len(top.reachable_services) == chain_len
        assert not math.isnan(top.score)
        assert not math.isnan(top.cascade_probability)
        assert 0.0 <= top.score <= 100.0
        assert 0.0 <= top.cascade_probability <= 1.0
        assert top.score >= 50.0  # deep chain of 25 services exerts significant cascading pressure

        # Explicitly verify the coupling probability for h > 15:
        p_16 = compute_path_probability(16, DEFAULT_P0)
        p_20 = compute_path_probability(20, DEFAULT_P0)
        p_25 = compute_path_probability(25, DEFAULT_P0)
        assert 0.0 < p_25 < p_20 < p_16 < 0.10
        assert not math.isnan(p_25)
        assert not math.isinf(p_25)

    def test_deep_linear_dependency_chain_extreme_50_and_100_hops(self):
        """Extreme deep chain verification at h=50 and h=100 hops without underflow or NaN."""
        for hops in (50, 100, 200, 500):
            p = compute_path_probability(hops, DEFAULT_P0)
            assert 0.0 <= p <= 1.0
            assert not math.isnan(p)
            assert not math.isinf(p)
            # Combine paths of extreme length
            p_comb = combine_path_probabilities([hops, hops + 1, hops + 2], DEFAULT_P0)
            assert 0.0 <= p_comb <= 1.0
            assert not math.isnan(p_comb)

    def test_large_diamond_structure_multiple_convergent_paths(self):
        """Large diamond structure: Ingress -> {M_1..M_k} -> Target with K=50, 100, 200 convergent paths."""
        for k in (50, 100, 200):
            reachability = []
            # Intermediate nodes M_i depend directly on Target (hops=1)
            for i in range(k):
                reachability.append(
                    {
                        "target_id": "svc_diamond_target",
                        "dependent_id": f"svc_mid_{i}",
                        "tier": 2,
                        "hops": 1,
                        "path_ids": [f"svc_mid_{i}", "svc_diamond_target"],
                    }
                )
            # Ingress node depends on Target via each of the K intermediate nodes (hops=2)
            for i in range(k):
                reachability.append(
                    {
                        "target_id": "svc_diamond_target",
                        "dependent_id": "svc_ingress",
                        "tier": 1,
                        "customer_facing": True,
                        "hops": 2,
                        "path_ids": ["svc_ingress", f"svc_mid_{i}", "svc_diamond_target"],
                    }
                )

            items = compute_avalanche_centrality(reachability, [])
            assert len(items) == 1
            top = items[0]
            assert top.service_id == "svc_diamond_target"
            assert len(top.reachable_services) == k + 1
            assert not math.isnan(top.score)
            assert not math.isnan(top.cascade_probability)
            assert 0.0 <= top.score <= 100.0
            assert 0.0 <= top.cascade_probability <= 1.0
            # With K >= 50 convergent paths, score should saturate to 100.0
            assert top.score == 100.0
            assert top.cascade_probability == 1.0
            assert top.band == "critical"

    def test_nested_multi_tier_diamond_lattice(self):
        """Nested 3-tier diamond with convergent paths of heterogeneous lengths (hops 1 to 4)."""
        reachability = []
        # Target has 10 direct dependents
        for i in range(10):
            reachability.append(
                {"target_id": "svc_core", "dependent_id": f"svc_l1_{i}", "tier": 1, "hops": 1, "path_ids": [f"svc_l1_{i}", "svc_core"]}
            )
        # 10 layer 2 services, each routing through 2 layer 1 services (20 paths of length 2)
        for i in range(10):
            for j in (i, (i + 1) % 10):
                reachability.append(
                    {"target_id": "svc_core", "dependent_id": f"svc_l2_{i}", "tier": 2, "hops": 2, "path_ids": [f"svc_l2_{i}", f"svc_l1_{j}", "svc_core"]}
                )
        # 5 customer-facing gateway services, each routing through 3 layer 2 services (15 paths of length 3)
        for i in range(5):
            for j in (i, i + 1, i + 2):
                reachability.append(
                    {"target_id": "svc_core", "dependent_id": f"svc_gw_{i}", "tier": 1, "customer_facing": True, "hops": 3, "path_ids": [f"svc_gw_{i}", f"svc_l2_{j}", f"svc_l1_{j}", "svc_core"]}
                )

        items = compute_avalanche_centrality(reachability, [])
        assert len(items) == 1
        item = items[0]
        assert item.service_id == "svc_core"
        assert len(item.reachable_services) == 25  # 10 + 10 + 5
        assert 0.0 <= item.score <= 100.0
        assert 0.0 <= item.cascade_probability <= 1.0
        assert not math.isnan(item.score)
        assert item.score >= 95.0

    def test_probability_boundaries_and_extreme_parameters(self):
        """Verify strict [0, 1] interval on extreme p0, negative hops, huge raw_ac, and k_avalanche."""
        # 1. p0 = 0.0 (zero propagation)
        assert compute_path_probability(1, p0=0.0) == 0.0
        assert combine_path_probabilities([1, 2, 3], p0=0.0) == 0.0

        # 2. p0 = 1.0 (deterministic propagation)
        assert compute_path_probability(1, p0=1.0) == 1.0
        assert compute_path_probability(10, p0=1.0) == 1.0
        assert combine_path_probabilities([1, 2], p0=1.0) == 1.0

        # 3. Negative hops returns 1.0 safely without crashing
        assert compute_path_probability(-1, DEFAULT_P0) == 1.0
        assert compute_path_probability(0, DEFAULT_P0) == 1.0

        # 4. Zero and negative k_avalanche uses default fallback safely
        items_k0 = compute_avalanche_centrality(
            [{"target_id": "svc_k0", "dependent_id": "svc_dep", "hops": 1, "path_ids": ["svc_dep", "svc_k0"]}],
            [],
            k_avalanche=0.0,
        )
        assert not math.isnan(items_k0[0].score)
        assert not math.isinf(items_k0[0].score)

        items_kneg = compute_avalanche_centrality(
            [{"target_id": "svc_kneg", "dependent_id": "svc_dep", "hops": 1, "path_ids": ["svc_dep", "svc_kneg"]}],
            [],
            k_avalanche=-10.0,
        )
        assert not math.isnan(items_kneg[0].score)
        assert not math.isinf(items_kneg[0].score)


# ==============================================================================
# SECTION 2: Temporal Expiry Collision Dynamics
# ==============================================================================


class TestTemporalCollisionDynamics:
    """Empirical challenge tests for sliding window bounding and criticality factors."""

    def test_cluster_sliding_window_strict_bounding(self):
        """Invariant: Every detected cluster must satisfy window_end - window_start <= 7 days (604,800s)."""
        rng = random.Random(1337)
        rows = []
        for i in range(60):
            eid = f"exc_stagger_{i:02d}"
            # Stagger expiries across 45 days
            t_exp = BASE_AS_OF + rng.randint(0, 45) * DAY_S + rng.randint(0, 3600)
            rows.append(
                {
                    "exception_id": eid,
                    "exception_title": f"Staggered Exception {i}",
                    "severity": rng.randint(1, 5),
                    "expires_at": t_exp,
                    "service_id": f"svc_{i % 5}",
                    "service_tier": 1,
                    "service_customer_facing": True,
                    "connected_service_id": f"svc_{(i + 1) % 5}",
                    "connected_service_tier": 1,
                    "hops": 1,
                    "path_ids": [f"svc_{i % 5}", f"svc_{(i + 1) % 5}"],
                }
            )

        clusters = compute_temporal_collisions(rows, window_days=7)
        assert len(clusters) > 0

        for col in clusters:
            span_s = col.window_end - col.window_start
            assert span_s <= WINDOW_7D_S, (
                f"Cluster {col.cluster_id} exceeded 7-day sliding window: span={span_s}s > {WINDOW_7D_S}s!"
            )
            assert len(col.exception_ids) >= 2
            assert 0.0 <= col.severity_score

    def test_sliding_window_exact_boundary_invariance(self):
        """Boundary test: T + 7d is included; T + 7d + 1s is excluded."""
        t_start = BASE_AS_OF + 5 * DAY_S
        t_inc = t_start + WINDOW_7D_S
        t_exc = t_start + WINDOW_7D_S + 1

        rows_inc = [
            {"exception_id": "exc_a", "severity": 3, "expires_at": t_start, "service_id": "svc_core", "connected_service_id": "svc_core"},
            {"exception_id": "exc_b", "severity": 3, "expires_at": t_inc, "service_id": "svc_core", "connected_service_id": "svc_core"},
        ]
        res_inc = compute_temporal_collisions(rows_inc, window_days=7)
        assert len(res_inc) == 1
        assert set(res_inc[0].exception_ids) == {"exc_a", "exc_b"}

        rows_exc = [
            {"exception_id": "exc_a", "severity": 3, "expires_at": t_start, "service_id": "svc_core", "connected_service_id": "svc_core"},
            {"exception_id": "exc_b", "severity": 3, "expires_at": t_exc, "service_id": "svc_core", "connected_service_id": "svc_core"},
        ]
        res_exc = compute_temporal_collisions(rows_exc, window_days=7)
        assert len(res_exc) == 0

    def test_staggered_chaining_window_isolation(self):
        """Staggered chain: E1 at T, E2 at T+5d, E3 at T+10d.
        |T2 - T1| = 5d <= 7d; |T3 - T2| = 5d <= 7d; but |T3 - T1| = 10d > 7d.
        Invariant: E1 and E3 must NEVER be clustered together in the same cluster.
        """
        t1 = BASE_AS_OF
        t2 = BASE_AS_OF + 5 * DAY_S
        t3 = BASE_AS_OF + 10 * DAY_S

        rows = [
            {"exception_id": "exc_1", "severity": 3, "expires_at": t1, "service_id": "svc_x", "connected_service_id": "svc_x"},
            {"exception_id": "exc_2", "severity": 3, "expires_at": t2, "service_id": "svc_x", "connected_service_id": "svc_x"},
            {"exception_id": "exc_3", "severity": 3, "expires_at": t3, "service_id": "svc_x", "connected_service_id": "svc_x"},
        ]
        clusters = compute_temporal_collisions(rows, window_days=7)
        for col in clusters:
            assert not ({"exc_1", "exc_3"}.issubset(set(col.exception_ids))), (
                "Violation: exc_1 and exc_3 separated by 10 days were falsely clustered together!"
            )
            assert col.window_end - col.window_start <= WINDOW_7D_S

    @pytest.mark.parametrize(
        "tier,customer_facing,multi_service,expected_crit_factor",
        [
            # Tier 1 combinations
            (1, False, False, 1.35),
            (1, True, False, 1.40),
            (1, False, True, 1.40),
            (1, True, True, 1.45),
            # Tier 2 combinations
            (2, False, False, 1.20),
            (2, True, False, 1.25),
            (2, False, True, 1.25),
            (2, True, True, 1.30),
            # Tier 3 combinations
            (3, False, False, 1.00),
            (3, True, False, 1.05),
            (3, False, True, 1.05),
            (3, True, True, 1.10),
        ],
    )
    def test_all_twelve_criticality_factor_combinations(
        self, tier: int, customer_facing: bool, multi_service: bool, expected_crit_factor: float
    ):
        """Exhaustively verify all 12 combinations of tier, customer_facing, and multi_service."""
        t = BASE_AS_OF + 2 * DAY_S
        # 2 exceptions of severity 3 each
        # sum_sev = 6. n = 2 -> size_multiplier = 1 + (2 - 1)/2 = 1.5
        # expected_score = round(6 * 1.5 * expected_crit_factor, 1) = round(9 * expected_crit_factor, 1)
        expected_score = round(9.0 * expected_crit_factor, 1)

        svc_a = "svc_test_a"
        svc_b = "svc_test_b" if multi_service else "svc_test_a"

        rows = [
            {
                "exception_id": "exc_1",
                "severity": 3,
                "expires_at": t,
                "service_id": svc_a,
                "service_tier": tier,
                "service_customer_facing": customer_facing,
                "connected_service_id": svc_b,
                "connected_service_tier": tier,
                "hops": 1 if multi_service else 0,
                "path_ids": [svc_a, svc_b] if multi_service else [svc_a],
            },
            {
                "exception_id": "exc_2",
                "severity": 3,
                "expires_at": t + 86400,
                "service_id": svc_b,
                "service_tier": tier,
                "service_customer_facing": False,
                "connected_service_id": svc_b,
                "connected_service_tier": tier,
                "hops": 0,
                "path_ids": [svc_b],
            },
        ]

        clusters = compute_temporal_collisions(rows, window_days=7)
        assert len(clusters) == 1
        col = clusters[0]
        assert pytest.approx(col.severity_score, 0.01) == expected_score, (
            f"Failed for tier={tier}, customer_facing={customer_facing}, multi_service={multi_service}: "
            f"got {col.severity_score}, expected {expected_score} (crit_factor={expected_crit_factor})"
        )


# ==============================================================================
# SECTION 3: Provenance Guardrail guard.py Adversarial Rigor & Bypass Analysis
# ==============================================================================


class TestProvenanceGuardrailAdversarial:
    """Empirical challenge tests for provenance guardrail guard.py."""

    KNOWN = {
        "svc_checkout_api": "Checkout API",
        "svc_payments": "Payments Gateway",
        "exc_tls_cert": "TLS Certificate Exception",
        "per_priya": "Priya Sharma",
        "ctl_soc2": "SOC2 CC6.1 Access Control",
    }

    def test_pure_grounded_text_unaltered(self):
        """Grounded text citing only known entity IDs is 100% preserved."""
        text = "Service svc_checkout_api is monitored by per_priya under ctl_soc2."
        clean, citations, removed = ground(text, self.KNOWN)
        assert removed == 0
        assert clean == text
        assert len(citations) == 3
        assert {c["id"] for c in citations} == {"svc_checkout_api", "per_priya", "ctl_soc2"}

    def test_subtle_hallucinated_id_pruned(self):
        """Subtle hallucinated IDs (e.g. version bump svc_checkout_api_v2) are pruned."""
        subtle_fakes = [
            "svc_checkout_api_v2",
            "svc_checkout_api_backup",
            "svc_payments_gateway_internal",
            "exc_tls_cert_expired_2026",
            "per_priya_sharma",
            "ctl_soc2_cc62",
            "team_devops_alpha",
            "cc_mfa_override_1",
            "cp_vip_checkout",
            "rbk_failover_vault",
            "alt_critical_db_down",
            "rev_q3_security",
            "ev_pci_screenshot",
        ]
        for fake in subtle_fakes:
            text = f"Anchor svc_checkout_api is safe. Fake entity {fake} is compromised."
            clean, citations, removed = ground(text, self.KNOWN)
            assert removed == 1, f"Failed to prune sentence with subtle fake {fake}!"
            assert fake not in clean, f"Fake ID {fake} survived in output clean text!"
            assert "svc_checkout_api" in clean

    def test_adversarial_markdown_syntax_variations(self):
        """Test markdown syntax embeddings: bold, code, quotes, brackets, punctuation."""
        fake = "svc_hallucinated_proxy"
        templates = [
            f"Sentence with `{fake}` in inline code.",
            f"Sentence with **{fake}** in bold.",
            f"Sentence with *{fake}* in asterisk italics.",
            f"Sentence with ({fake}) in parentheses.",
            f"Sentence with [{fake}](https://example.com) in markdown link.",
            f"Sentence with {fake}. Period right after.",
            f"Sentence with {fake}, comma right after.",
            f"Sentence with {fake}: colon right after.",
            f"Sentence with {fake}; semicolon right after.",
            f"Sentence with \"{fake}\" in double quotes.",
            f"Sentence with '{fake}' in single quotes.",
            f"- Bullet item citing {fake}.",
            f"| Table column | {fake} |",
        ]
        for t in templates:
            clean, citations, removed = ground(t, self.KNOWN)
            assert removed == 1, f"Failed to prune sentence in template: {t}"
            assert fake not in clean, f"Fake ID survived in: {clean}"

    def test_empirical_finding_underscore_italics_bypass(self):
        """EMPERICAL FINDING / BUG: In Markdown, italicizing with underscores '_svc_fake_'
        causes ID_RE (\b) to fail to match because '_' is a word character in Python regex.
        This demonstrates the exact boundary condition where guard.py does NOT prune.
        """
        fake = "svc_phantom_database"
        text = f"Notice: Service _{fake}_ is undergoing maintenance."
        clean, citations, removed = ground(text, self.KNOWN)

        # Empirically document the behavior:
        # ID_RE does not match _svc_phantom_database_ because there is no word boundary
        # between '_' and 's'.
        matches = ID_RE.findall(text)
        assert matches == [], "Empirical observation: ID_RE cannot find IDs wrapped in single underscores"
        assert removed == 0, "Guard did not prune sentence because ID_RE missed the underscore-wrapped ID"
        assert f"_{fake}_" in clean, "The unverified ID survived in clean output due to underscore regex boundary"

    def test_100_percent_pruning_on_all_regex_matched_uncited_ids(self):
        """Verification: When an uncited ID matches ID_RE, pruning accuracy is exactly 100%."""
        rng = random.Random(999)
        prefixes = ["exc", "svc", "per", "team", "ctl", "cc", "cp", "rbk", "alt", "rev", "ev"]
        for trial in range(50):
            p = rng.choice(prefixes)
            fake_id = f"{p}_random_fake_{trial}_{rng.randint(1000, 9999)}"
            text = f"System alert: {fake_id} has exceeded thresholds."
            clean, citations, removed = ground(text, self.KNOWN)
            assert removed == 1
            assert clean == ""
            assert citations == []
