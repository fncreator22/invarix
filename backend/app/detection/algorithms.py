"""PageRank / betweenness / WCC with a degree-centrality fallback (FR-DET-10)."""

import structlog

from app.graph.repo import ALGO_TIMEOUT_MS, Repo

log = structlog.get_logger()


def minmax(values: dict[str, float]) -> dict[str, float]:
    if not values:
        return {}
    lo, hi = min(values.values()), max(values.values())
    if hi == lo:
        return {k: 0.0 for k in values}
    return {k: (v - lo) / (hi - lo) for k, v in values.items()}


async def centrality(repo: Repo, weights: dict[str, float]) -> dict[str, float]:
    """Normalized centrality per service in [0, 1]: a·minmax(PageRank) + b·minmax(betweenness)."""
    pr: dict[str, float] = {}
    bt: dict[str, float] = {}
    has_edges = (await repo.read("dependency_edge_count"))[0]["n"] > 0
    try:
        if has_edges:
            pr = {r["service_id"]: r["score"] for r in await repo.read("algo_pagerank", timeout=ALGO_TIMEOUT_MS)}
            bt = {r["service_id"]: r["score"] for r in await repo.read("algo_betweenness", timeout=ALGO_TIMEOUT_MS)}
    except Exception as ex:  # procedure missing, timeout, engine error
        log.warning("algo_fallback", error=str(ex))
        pr, bt = {}, {}
    if not pr:
        rows = await repo.read("service_degrees")
        pr = {r["service_id"]: float(r["in_deg"]) for r in rows}
        bt = {r["service_id"]: float(r["deg"]) for r in rows}
    npr, nbt = minmax(pr), minmax(bt)
    a, b = weights.get("pagerank", 0.6), weights.get("betweenness", 0.4)
    return {s: min(max(a * npr.get(s, 0.0) + b * nbt.get(s, 0.0), 0.0), 1.0) for s in set(npr) | set(nbt)}


async def clusters(repo: Repo) -> list[dict[str, object]]:
    rows = await repo.read("algo_wcc", timeout=ALGO_TIMEOUT_MS)
    return [{"id": r["component_id"], "members": r["members"]} for r in rows if len(r["members"]) > 1]
