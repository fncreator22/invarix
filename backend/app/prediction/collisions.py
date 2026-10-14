"""Temporal Expiry Collision Dynamics engine.

Projects future calendar windows to detect dangerous convergence points where
multiple exceptions/waivers expire simultaneously across dependency-connected
services within <=2 hops.

Formula:
  Score(C) = sum_{e in C} Severity(e) * (1 + (|C| - 1)/2) * CriticalityFactor(Chain)
"""

from __future__ import annotations

import re
from typing import Any

from app.prediction.models import ProofEdge, ProofGraph, TemporalCollisionItem

DEFAULT_WINDOW_DAYS = 7


def _slug(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", text).strip("_").lower()
    return cleaned.removeprefix("svc_").removeprefix("exc_")



def compute_temporal_collisions(
    collision_rows: list[dict[str, Any]],
    *,
    window_days: int = DEFAULT_WINDOW_DAYS,
) -> list[TemporalCollisionItem]:
    """Detect collision clusters across sliding calendar windows and connected services."""
    window_s = window_days * 86400

    exceptions: dict[str, dict[str, Any]] = {}
    service_info: dict[str, dict[str, Any]] = {}

    for row in collision_rows:
        eid = row.get("exception_id")
        if not eid:
            continue
        if eid not in exceptions:
            exceptions[eid] = {
                "id": eid,
                "title": row.get("exception_title") or eid,
                "severity": int(row.get("severity") or 1),
                "expires_at": int(row.get("expires_at") or 0),
                "affected_services": set(),
                "connected_services": set(),
                "paths": [],
            }

        sid = row.get("service_id")
        if sid:
            exceptions[eid]["affected_services"].add(sid)
            exceptions[eid]["connected_services"].add(sid)
            if sid not in service_info:
                service_info[sid] = {
                    "name": row.get("service_name") or sid,
                    "tier": int(row.get("service_tier") or 2),
                    "customer_facing": bool(row.get("service_customer_facing")),
                }

        target_id = row.get("connected_service_id")
        if target_id:
            exceptions[eid]["connected_services"].add(target_id)
            if target_id not in service_info:
                service_info[target_id] = {
                    "name": row.get("connected_service_name") or target_id,
                    "tier": int(row.get("connected_service_tier") or 2),
                    "customer_facing": False,
                }

        path_ids = row.get("path_ids") or []
        if path_ids:
            exceptions[eid]["paths"].append(path_ids)

    sorted_excs = sorted(exceptions.values(), key=lambda e: (e["expires_at"], e["id"]))

    def are_connected(e1: dict[str, Any], e2: dict[str, Any]) -> bool:
        """Check if two exceptions are connected within <= 2 hops."""
        aff1 = e1["affected_services"]
        aff2 = e2["affected_services"]
        conn1 = e1["connected_services"]
        conn2 = e2["connected_services"]

        if aff1 & aff2:
            return True
        if aff1 & conn2 or aff2 & conn1:
            return True
        if conn1 & conn2:
            return True
        return False

    candidate_clusters: list[list[str]] = []

    for i, anchor in enumerate(sorted_excs):
        window_start = anchor["expires_at"]
        window_end = window_start + window_s

        in_window = [e for e in sorted_excs[i:] if e["expires_at"] <= window_end]
        if len(in_window) < 2:
            continue

        adj: dict[str, set[str]] = {e["id"]: set() for e in in_window}
        for idx_a in range(len(in_window)):
            for idx_b in range(idx_a + 1, len(in_window)):
                ea = in_window[idx_a]
                eb = in_window[idx_b]
                if are_connected(ea, eb):
                    adj[ea["id"]].add(eb["id"])
                    adj[eb["id"]].add(ea["id"])

        visited: set[str] = set()
        for e in in_window:
            eid = e["id"]
            if eid in visited:
                continue
            component: list[str] = []
            queue = [eid]
            visited.add(eid)
            while queue:
                curr = queue.pop(0)
                component.append(curr)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

            if len(component) >= 2:
                candidate_clusters.append(sorted(component))

    unique_clusters: list[list[str]] = []
    seen_sets: set[tuple[str, ...]] = set()

    candidate_clusters.sort(key=lambda c: -len(c))
    for comp in candidate_clusters:
        comp_tuple = tuple(comp)
        if comp_tuple in seen_sets:
            continue
        comp_set = set(comp)
        if any(comp_set.issubset(set(u)) for u in unique_clusters):
            continue
        seen_sets.add(comp_tuple)
        unique_clusters.append(comp)

    items: list[TemporalCollisionItem] = []

    for idx, comp in enumerate(unique_clusters, start=1):
        cluster_excs = [exceptions[eid] for eid in comp]
        window_start = min(e["expires_at"] for e in cluster_excs)
        window_end = max(e["expires_at"] for e in cluster_excs)

        aff_services: set[str] = set()
        for e in cluster_excs:
            aff_services.update(e["affected_services"])

        tiers = [service_info.get(s, {}).get("tier", 2) for s in aff_services]
        min_tier = min(tiers) if tiers else 2
        if min_tier == 1:
            crit_factor = 1.35
        elif min_tier == 2:
            crit_factor = 1.2
        else:
            crit_factor = 1.0

        if any(service_info.get(s, {}).get("customer_facing") for s in aff_services):
            crit_factor += 0.05
        if len(aff_services) > 1:
            crit_factor += 0.05

        n = len(cluster_excs)
        sum_sev = sum(e["severity"] for e in cluster_excs)
        size_multiplier = 1.0 + (n - 1) / 2.0
        severity_score = round(sum_sev * size_multiplier * crit_factor, 1)

        proof_nodes: set[str] = set(comp) | aff_services
        proof_edges_set: set[tuple[str, str, str]] = set()

        for e in cluster_excs:
            eid = e["id"]
            for sid in e["affected_services"]:
                proof_edges_set.add((eid, sid, "AFFECTS"))
            for path in e.get("paths", []):
                for node in path:
                    proof_nodes.add(node)
                for i in range(len(path) - 1):
                    proof_edges_set.add((path[i], path[i + 1], "DEPENDS_ON"))

        proof_edges = [
            ProofEdge(from_node=src, to=dst, type=rel)
            for src, dst, rel in sorted(proof_edges_set)
        ]

        service_slugs = "_".join(sorted(_slug(s) for s in aff_services)[:2])
        cluster_id = f"col_{service_slugs}_w{idx}" if service_slugs else f"col_cluster_w{idx}"

        severity_band = (
            "critical"
            if severity_score >= 75.0
            else "high"
            if severity_score >= 50.0
            else "moderate"
            if severity_score >= 25.0
            else "low"
        )

        items.append(
            TemporalCollisionItem(
                cluster_id=cluster_id,
                window_start=window_start,
                window_end=window_end,
                exception_ids=comp,
                affected_services=sorted(aff_services),
                severity_score=severity_score,
                collision_severity=severity_score,
                severity_band=severity_band,
                proof=ProofGraph(nodes=sorted(proof_nodes), edges=proof_edges),
            )
        )

    items.sort(key=lambda c: (-c.severity_score, c.window_start))
    return items
