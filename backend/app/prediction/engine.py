"""Prediction engine orchestrator.

Coordinates FalkorDB Cypher queries and pure mathematical algorithms
to generate deterministic simulation forecasts and canvas decorations.
"""

from __future__ import annotations

import time

from app.graph.repo import Repo
from app.prediction.avalanche import compute_avalanche_centrality
from app.prediction.collisions import compute_temporal_collisions
from app.prediction.models import (
    CanvasNodeDecoration,
    SimulationForecastOut,
)

COLOR_BY_BAND = {
    "critical": "#ef4444",
    "high": "#f97316",
    "moderate": "#eab308",
    "low": "#22c55e",
}


async def run_prediction_simulation(
    repo: Repo,
    *,
    as_of: int,
    horizon_days: int = 30,
    target_service_id: str | None = None,
) -> SimulationForecastOut:
    """Execute prediction simulation and return synchronized forecast payload."""
    t0 = time.perf_counter()
    horizon_s = horizon_days * 86400
    projected_date = as_of + horizon_s

    # 1. Execute bounded Cypher queries (<15ms expected)
    reachability_rows = await repo.read(
        "pred_avalanche_reachability",
        service_id=target_service_id,
    )
    customer_path_rows = await repo.read(
        "pred_avalanche_customer_paths",
        service_id=target_service_id,
    )
    collision_rows = await repo.read(
        "pred_temporal_collisions",
        as_of=as_of,
        horizon_s=horizon_s,
    )

    # 2. Pure deterministic mathematical calculations
    avalanche_items = compute_avalanche_centrality(
        reachability_rows,
        customer_path_rows,
        target_service_id=target_service_id,
    )
    collision_items = compute_temporal_collisions(
        collision_rows,
        window_days=7,
    )

    # 3. Canvas Node Decorations
    all_service_ids: set[str] = {it.service_id for it in avalanche_items}
    for col in collision_items:
        all_service_ids.update(col.affected_services)

    avalanche_by_sid = {it.service_id: it for it in avalanche_items}

    # Pre-index collision impact by service
    collisions_by_sid: dict[str, list[float]] = {}
    for col in collision_items:
        for sid in col.affected_services:
            collisions_by_sid.setdefault(sid, []).append(col.severity_score)

    canvas_decorations: dict[str, CanvasNodeDecoration] = {}

    for sid in sorted(all_service_ids):
        ac_item = avalanche_by_sid.get(sid)
        base_score = ac_item.score if ac_item else 0.0

        is_spof = bool(
            ac_item
            and (
                ac_item.band == "critical"
                or (ac_item.spof_rank <= 3 and ac_item.score >= 50.0 and len(ac_item.reachable_services) >= 1)
            )
        )

        col_scores = collisions_by_sid.get(sid, [])
        has_collision = len(col_scores) > 0

        # Compound simulated risk score
        if has_collision:
            collision_boost = max(col_scores) * 0.5
            simulated_score = min(100.0, round(base_score + collision_boost, 1))
        else:
            simulated_score = round(base_score, 1)

        # Risk band for simulated score
        if simulated_score >= 75.0:
            risk_band = "critical"
        elif simulated_score >= 50.0:
            risk_band = "high"
        elif simulated_score >= 25.0:
            risk_band = "moderate"
        else:
            risk_band = "low"

        pulse = is_spof or has_collision or (risk_band == "critical")
        color = COLOR_BY_BAND.get(risk_band, "#22c55e")

        canvas_decorations[sid] = CanvasNodeDecoration(
            simulated_score=simulated_score,
            risk_band=risk_band,
            is_spof=is_spof,
            has_collision=has_collision,
            pulse=pulse,
            color=color,
        )

    execution_time_ms = round((time.perf_counter() - t0) * 1000, 2)

    return SimulationForecastOut(
        as_of=as_of,
        horizon_days=horizon_days,
        projected_date=projected_date,
        execution_time_ms=execution_time_ms,
        avalanche_centrality=avalanche_items,
        temporal_collisions=collision_items,
        canvas_decorations=canvas_decorations,
    )
