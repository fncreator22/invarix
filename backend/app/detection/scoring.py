"""Deterministic service risk score (03 §8.4). Pure functions: same inputs → same score."""

import math
from typing import Any

from app.ids import DAY


def band(score: float, bands: dict[str, float]) -> str:
    if score >= bands["critical"]:
        return "critical"
    if score >= bands["high"]:
        return "high"
    if score >= bands["moderate"]:
        return "moderate"
    return "low"


def _decay(cfg: dict[str, Any], hops: int) -> float:
    table = cfg["hop_decay"]
    return float(table.get(hops, table.get(str(hops), 0.0)))


def contribution(exc: dict[str, Any], hops: int, centrality: float, cfg: dict[str, Any], as_of: int) -> dict[str, Any]:
    base = exc["severity"] * (exc["control_weight"] / 3)
    age_days = max(as_of - exc["granted_at"], 0) / DAY
    age_factor = 1 + cfg["age_weight"] * min(age_days / cfg["age_cap_days"], 1)
    overdue = cfg["overdue_multiplier"] if exc["expires_at"] < as_of else 1.0
    value = base * age_factor * overdue * (1 + centrality) * _decay(cfg, hops)
    return {
        "exception_id": exc["id"],
        "hops": hops,
        "base": round(base, 4),
        "age_factor": round(age_factor, 4),
        "overdue": overdue,
        "centrality": round(centrality, 4),
        "value": round(value, 4),
    }



def score_services(
    *,
    service_ids: list[str],
    radius: dict[str, dict[str, list[str]]],
    exceptions: dict[str, dict[str, Any]],
    centrality: dict[str, float],
    r3_exceptions: set[str],
    r6_exceptions: set[str],
    r8_services: set[str],
    cfg: dict[str, Any],
    as_of: int,
) -> dict[str, dict[str, Any]]:
    """radius[s][e] = node ids of the shortest path s → … → landing service → e."""
    out: dict[str, dict[str, Any]] = {}
    m = cfg["rule_multiplier"]
    for s in service_ids:
        contribs = []
        for e, path in sorted(radius.get(s, {}).items()):
            hops = len(path) - 2  # nodes = services on the path + the exception
            landing = path[-2]
            contribs.append(contribution(exceptions[e], hops, centrality.get(landing, 0.0), cfg, as_of))
        raw = sum(c["value"] for c in contribs)
        in_radius = set(radius.get(s, {}))
        hits = [
            r
            for r, hit in (
                ("R3", in_radius & r3_exceptions),
                ("R6", in_radius & r6_exceptions),
                ("R8", s in r8_services),
            )
            if hit
        ]
        multiplier = 1.0
        for _ in hits:
            multiplier *= 1 + m
        score = 100 * (1 - math.exp(-raw * multiplier / cfg["K"]))
        out[s] = {
            "service_id": s,
            "raw": round(raw, 4),
            "multiplier": multiplier,
            "score": round(score, 1),
            "band": band(score, cfg["bands"]),
            "contributions": sorted(contribs, key=lambda c: (-c["value"], c["exception_id"])),
            "rule_hits": hits,
            "config_version": cfg.get("version", 1),
            "as_of": as_of,
        }
    return out
