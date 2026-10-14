"""Prediction API endpoints."""

from fastapi import APIRouter, Depends, Query

from app.auth.deps import WorkspaceContext, viewer
from app.prediction.engine import run_prediction_simulation
from app.prediction.models import SimulationForecastOut

router = APIRouter(prefix="/workspaces/{ws_id}", tags=["prediction"])


@router.get("/prediction/simulation", response_model=SimulationForecastOut)
async def get_simulation_forecast(
    horizon_days: int = Query(default=30, ge=0, le=365, description="Projection horizon in days (e.g. 0, 7, 30, 90)"),
    target_service_id: str | None = Query(default=None, description="Optional service ID to focus simulation on"),
    ctx: WorkspaceContext = Depends(viewer),
) -> SimulationForecastOut:
    """Run deterministic mathematical forecasting engine for cascading failures and temporal collisions."""
    return await run_prediction_simulation(
        ctx.org,
        as_of=ctx.as_of,
        horizon_days=horizon_days,
        target_service_id=target_service_id,
    )
