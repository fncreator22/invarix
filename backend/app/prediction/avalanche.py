"""Avalanche Centrality and SPOF ranking engine.

Implements deterministic cascading failure propagation over inverted dependencies:
- Dependencies flow s -> DEPENDS_ON -> t.
- Failures propagate reversely: if t fails, upstream dependents s are vulnerable.
- Reachability set R(u) = {v in Services | exists path v -> DEPENDS_ON+ -> u}.
- Multi-hop coupling failure probability: P(P) = p0^h (default p0 = 0.85).
- Multiple independent path failure probability: P_cascade(v | u) = 1 - prod(1 - P(P)).
- Total Avalanche Centrality AC(u) weighted by downstream tiers and customer paths.
- Normalization to [0, 100] via exponential saturation.
"""

from __future__ import annotations

import math
from typing import Any

from app.prediction.models import AvalancheCentralityItem, ProofEdge, ProofGraph

DEFAULT_P0 = 0.85
DEFAULT_K_AVALANCHE = 5.0
TIER_WEIGHTS: dict[int, float] = {
    1: 3.0,
    2: 2.0,
    3: 1.0,
}
CUSTOMER_PATH_WEIGHT = 3.0
CUSTOMER_FACING_BOOST = 1.0

_PROOF_EDGE_CACHE: dict[tuple[str, str, str], ProofEdge] = {}


def get_proof_edge(src: str, dst: str, rel: str) -> ProofEdge:
    key = (src, dst, rel)
    edge = _PROOF_EDGE_CACHE.get(key)
    if edge is None:
        edge = ProofEdge.model_construct(from_node=src, to=dst, type=rel)
        _PROOF_EDGE_CACHE[key] = edge
    return edge


def band(score: float) -> str:
    if score >= 75.0:
        return "critical"
    if score >= 50.0:
        return "high"
    if score >= 25.0:
        return "moderate"
    return "low"


def compute_path_probability(hops: int, p0: float = DEFAULT_P0) -> float:
    """Coupling probability along a single dependency path of length h."""
    if hops <= 0:
        return 1.0
    return p0**hops


def combine_path_probabilities(paths_hops: list[int], p0: float = DEFAULT_P0) -> float:
    """Multi-path cascade probability: 1 - prod(1 - p0^h)."""
    if not paths_hops:
        return 0.0
    if len(paths_hops) == 1:
        h = paths_hops[0]
        return p0**h if h > 0 else 1.0
    prob_no_cascade = 1.0
    for h in paths_hops:
        p_path = p0**h if h > 0 else 1.0
        prob_no_cascade *= 1.0 - p_path
    return 1.0 - prob_no_cascade



def compute_avalanche_centrality(
    reachability_rows: list[dict[str, Any]],
    customer_path_rows: list[dict[str, Any]],
    *,
    target_service_id: str | None = None,
    p0: float = DEFAULT_P0,
    k_avalanche: float = DEFAULT_K_AVALANCHE,
) -> list[AvalancheCentralityItem]:
    """Calculate Avalanche Centrality and SPOF ranking for all target services."""
    targets: dict[str, dict[str, Any]] = {}

    for row in reachability_rows:
        tid = row.get("target_id")
        if not tid:
            continue
        if tid not in targets:
            try:
                target_tier = int(row.get("target_tier") or 2)
            except (ValueError, TypeError):
                target_tier = 2
            targets[tid] = {
                "name": row.get("target_name") or tid,
                "tier": target_tier,
                "customer_facing": bool(row.get("target_customer_facing")),
                "dependents": {},
            }
        dep_id = row.get("dependent_id")
        if dep_id and dep_id != tid:
            path_ids = row.get("path_ids") or []
            hops = row.get("hops") or (len(path_ids) - 1 if path_ids else 1)
            deps = targets[tid]["dependents"]
            if dep_id not in deps:
                try:
                    dep_tier = int(row.get("tier") or 2)
                except (ValueError, TypeError):
                    dep_tier = 2
                deps[dep_id] = {
                    "name": row.get("dependent_name") or dep_id,
                    "tier": dep_tier,
                    "customer_facing": bool(row.get("customer_facing")),
                    "paths": [],
                    "hops": [],
                }
            deps[dep_id]["hops"].append(hops)
            if path_ids:
                deps[dep_id]["paths"].append(path_ids)

    customer_paths_by_target: dict[str, dict[str, Any]] = {}
    for row in customer_path_rows:
        tid = row.get("target_id")
        cpid = row.get("customer_path_id")
        if not tid or not cpid:
            continue
        if tid not in targets:
            try:
                target_tier = int(row.get("target_tier") or 2)
            except (ValueError, TypeError):
                target_tier = 2
            targets[tid] = {
                "name": row.get("target_name") or tid,
                "tier": target_tier,
                "customer_facing": bool(row.get("target_customer_facing")),
                "dependents": {},
            }
        if tid not in customer_paths_by_target:
            customer_paths_by_target[tid] = {}
        path_ids = row.get("path_ids") or []
        hops = row.get("hops") or (len(path_ids) - 1 if path_ids else 1)
        cp_dict = customer_paths_by_target[tid]
        if cpid not in cp_dict:
            cp_dict[cpid] = {
                "name": row.get("customer_path_name") or cpid,
                "paths": [],
                "hops": [],
            }
        cp_dict[cpid]["hops"].append(hops)
        if path_ids:
            cp_dict[cpid]["paths"].append(path_ids)

    computed_targets: list[dict[str, Any]] = []

    for tid, tinfo in targets.items():
        dependents = tinfo["dependents"]
        cp_dict = customer_paths_by_target.get(tid, {})

        raw_ac = 0.0
        direct_dependents_count = 0
        min_hops_list: list[int] = []
        proof_nodes: set[str] = {tid}
        proof_edges_set: set[tuple[str, str, str]] = set()

        for dep_id, dep_info in dependents.items():
            hops_list = dep_info["hops"]
            p_cascade = combine_path_probabilities(hops_list, p0)
            tier = dep_info["tier"]
            tier_weight = TIER_WEIGHTS.get(tier, 1.0)
            if dep_info.get("customer_facing"):
                tier_weight += CUSTOMER_FACING_BOOST
            raw_ac += tier_weight * p_cascade

            min_h = min(hops_list) if hops_list else 1
            min_hops_list.append(min_h)
            if min_h == 1:
                direct_dependents_count += 1

            proof_nodes.add(dep_id)
            for path in dep_info.get("paths", []):
                proof_nodes.update(path)
                proof_edges_set.update((path[i], path[i + 1], "DEPENDS_ON") for i in range(len(path) - 1))

        for cpid, cp_info in cp_dict.items():
            hops_list = cp_info["hops"]
            p_cascade = combine_path_probabilities(hops_list, p0)
            raw_ac += CUSTOMER_PATH_WEIGHT * p_cascade

            proof_nodes.add(cpid)
            for path in cp_info.get("paths", []):
                proof_nodes.update(path)
                if len(path) >= 2:
                    proof_edges_set.add((path[0], path[1], "REQUIRES"))
                    proof_edges_set.update((path[i], path[i + 1], "DEPENDS_ON") for i in range(1, len(path) - 1))

        all_coupling_hops = list(min_hops_list)
        for cp_info in cp_dict.values():
            if cp_info.get("hops"):
                all_coupling_hops.append(min(cp_info["hops"]))

        if not all_coupling_hops:
            cascade_prob = 0.0
        else:
            prob_no_cascade = 1.0
            for h in all_coupling_hops:
                prob_no_cascade *= 1.0 - (p0**h if h > 0 else 1.0)
            cascade_prob = 1.0 - prob_no_cascade

        k = k_avalanche if (k_avalanche and k_avalanche > 0) else DEFAULT_K_AVALANCHE
        score = 100.0 * (1.0 - math.exp(-raw_ac / k))

        proof_edges = [
            get_proof_edge(src, dst, rel)
            for src, dst, rel in sorted(proof_edges_set)
        ]

        reachable_services = sorted(dependents.keys())
        customer_paths = sorted(cp_dict.keys())

        computed_targets.append(
            {
                "service_id": tid,
                "service_name": tinfo["name"],
                "raw_ac": raw_ac,
                "score": round(score, 1),
                "band": band(score),
                "cascade_probability": round(cascade_prob, 2),
                "reachable_services": reachable_services,
                "customer_paths": customer_paths,
                "proof": ProofGraph.model_construct(nodes=sorted(proof_nodes), edges=proof_edges),
            }
        )

    computed_targets.sort(key=lambda x: (-x["score"], -x["raw_ac"], x["service_id"]))

    items: list[AvalancheCentralityItem] = []
    for rank, item in enumerate(computed_targets, start=1):
        items.append(
            AvalancheCentralityItem.model_construct(
                service_id=item["service_id"],
                service_name=item["service_name"],
                score=item["score"],
                band=item["band"],
                spof_rank=rank,
                cascade_probability=item["cascade_probability"],
                reachable_services=item["reachable_services"],
                customer_paths=item["customer_paths"],
                proof=item["proof"],
            )
        )

    if target_service_id:
        items = [it for it in items if it.service_id == target_service_id]

    return items
