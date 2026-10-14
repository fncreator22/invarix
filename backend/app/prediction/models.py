"""Pydantic models for Predictive Company Brain simulation and forecasting."""

from pydantic import BaseModel, ConfigDict, Field


class ProofEdge(BaseModel):
    from_node: str = Field(alias="from", serialization_alias="from")
    to: str
    type: str

    model_config = ConfigDict(populate_by_name=True)


class ProofGraph(BaseModel):
    nodes: list[str] = Field(default_factory=list)
    edges: list[ProofEdge] = Field(default_factory=list)


class AvalancheCentralityItem(BaseModel):
    service_id: str
    service_name: str
    score: float
    band: str
    spof_rank: int
    cascade_probability: float
    reachable_services: list[str] = Field(default_factory=list)
    customer_paths: list[str] = Field(default_factory=list)
    proof: ProofGraph


class TemporalCollisionItem(BaseModel):
    cluster_id: str
    window_start: int
    window_end: int
    exception_ids: list[str] = Field(default_factory=list)
    affected_services: list[str] = Field(default_factory=list)
    severity_score: float
    collision_severity: float = 0.0
    severity_band: str = "moderate"
    proof: ProofGraph


class CanvasNodeDecoration(BaseModel):
    simulated_score: float
    risk_band: str
    is_spof: bool = False
    has_collision: bool = False
    pulse: bool = False
    color: str | None = None


class SimulationForecastOut(BaseModel):
    as_of: int
    horizon_days: int
    projected_date: int
    execution_time_ms: float
    avalanche_centrality: list[AvalancheCentralityItem] = Field(default_factory=list)
    temporal_collisions: list[TemporalCollisionItem] = Field(default_factory=list)
    canvas_decorations: dict[str, CanvasNodeDecoration] = Field(default_factory=dict)
