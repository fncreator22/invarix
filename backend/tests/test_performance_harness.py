"""Performance and Latency Benchmark Harness (R2, R4, F5).

Statistical p95 latency verification asserting that all predictive queries,
mathematical forecasting computations, and simulation endpoints execute in <100ms
over N=30 iterations against the seeded FalkorDB graph.
"""

import statistics
import time

import httpx
import pytest

from app.api.system import bootstrap
from app.graph import client as graph_client
from app.graph.repo import Repo
from app.graph.schema import ORG, ensure_schema
from app.ingest.loaders import load_bundle, read_bundle
from app.main import app
from app.prediction.avalanche import compute_avalanche_centrality
from app.prediction.collisions import compute_temporal_collisions
from app.prediction.engine import run_prediction_simulation
from tests.api_helpers import auth

TEST_AUTH_HEADER = auth("user_perf_bench", "perf_bench@example.com")
WARMUP_ITERATIONS = 5
LATENCY_P95_MAX_MS = 100.0


# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------
@pytest.fixture
async def seeded_repo(db, request):
    """Provide an isolated, schema-bootstrapped, and seeded FalkorDB graph."""
    r = Repo(db, f"test_perf_{request.node.name[:35]}")
    await ensure_schema(r, ORG)
    await load_bundle(r, read_bundle(), source="sample")
    return r


@pytest.fixture
async def live_ws(db):
    """Provide a full sample workspace via FastAPI ASGI test client."""
    graph_client._db = None
    await bootstrap()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1"
    ) as client:
        resp = await client.post(
            "/workspaces",
            headers=TEST_AUTH_HEADER,
            json={
                "name": "Performance Evaluation Workspace",
                "slug": "perf-eval-ws",
                "data_mode": "sample",
            },
        )
        assert resp.status_code == 201, resp.text
        ws_id = resp.json()["id"]
        yield client, ws_id, f"/workspaces/{ws_id}"
    await graph_client.close_db()


def compute_quantiles(samples: list[float]) -> dict[str, float]:
    """Compute p50, p95, p99, and max from a sample distribution."""
    q20 = statistics.quantiles(samples, n=20)
    q100 = statistics.quantiles(samples, n=100) if len(samples) >= 100 else q20
    return {
        "p50": round(statistics.median(samples), 2),
        "p95": round(q20[18], 2),  # 95th percentile
        "p99": round(q100[-1], 2),
        "max": round(max(samples), 2),
        "min": round(min(samples), 2),
    }


# -----------------------------------------------------------------------------
# 1. Predictive Cypher Queries Latency Benchmarks
# -----------------------------------------------------------------------------
async def test_benchmark_avalanche_reachability_cypher_under_100ms(seeded_repo):
    """Benchmark pred_avalanche_reachability Cypher query over N=30 iterations."""
    # Warmup
    for _ in range(WARMUP_ITERATIONS):
        await seeded_repo.read("pred_avalanche_reachability", service_id=None)

    samples: list[float] = []
    for _ in range(N_ITERATIONS):
        t0 = time.perf_counter()
        rows = await seeded_repo.read("pred_avalanche_reachability", service_id=None)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        samples.append(elapsed_ms)
        assert len(rows) > 0, "Query returned 0 rows on seeded graph!"

    stats = compute_quantiles(samples)
    print(f"\n[BENCH] pred_avalanche_reachability: p50={stats['p50']}ms, p95={stats['p95']}ms, max={stats['max']}ms")
    assert stats["p95"] < LATENCY_P95_MAX_MS, (
        f"p95 latency {stats['p95']}ms exceeded {LATENCY_P95_MAX_MS}ms budget!"
    )


async def test_benchmark_avalanche_customer_paths_cypher_under_100ms(seeded_repo):
    """Benchmark pred_avalanche_customer_paths Cypher query over N=30 iterations."""
    for _ in range(WARMUP_ITERATIONS):
        await seeded_repo.read("pred_avalanche_customer_paths", service_id=None)

    samples: list[float] = []
    for _ in range(N_ITERATIONS):
        t0 = time.perf_counter()
        rows = await seeded_repo.read("pred_avalanche_customer_paths", service_id=None)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        samples.append(elapsed_ms)
        assert len(rows) > 0, "Query returned 0 rows on seeded graph!"

    stats = compute_quantiles(samples)
    print(f"\n[BENCH] pred_avalanche_customer_paths: p50={stats['p50']}ms, p95={stats['p95']}ms, max={stats['max']}ms")
    assert stats["p95"] < LATENCY_P95_MAX_MS, (
        f"p95 latency {stats['p95']}ms exceeded {LATENCY_P95_MAX_MS}ms budget!"
    )


async def test_benchmark_temporal_collisions_cypher_under_100ms(seeded_repo):
    """Benchmark pred_temporal_collisions Cypher query over N=30 iterations across horizons."""
    as_of = 1792195200  # 17 Oct 2026

    for horizon_days in (30, 90):
        horizon_s = horizon_days * 86400

        # Warmup
        for _ in range(WARMUP_ITERATIONS):
            await seeded_repo.read("pred_temporal_collisions", as_of=as_of, horizon_s=horizon_s)

        samples: list[float] = []
        for _ in range(N_ITERATIONS):
            t0 = time.perf_counter()
            rows = await seeded_repo.read("pred_temporal_collisions", as_of=as_of, horizon_s=horizon_s)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            samples.append(elapsed_ms)
            assert rows is not None

        stats = compute_quantiles(samples)
        print(
            f"\n[BENCH] pred_temporal_collisions (+{horizon_days}d): "
            f"p50={stats['p50']}ms, p95={stats['p95']}ms, max={stats['max']}ms"
        )
        assert stats["p95"] < LATENCY_P95_MAX_MS, (
            f"p95 latency {stats['p95']}ms exceeded {LATENCY_P95_MAX_MS}ms budget at +{horizon_days}d!"
        )


# -----------------------------------------------------------------------------
# 2. Pure Mathematical Engine Computation Benchmarks
# -----------------------------------------------------------------------------
async def test_benchmark_mathematical_algorithms_in_memory_under_100ms(seeded_repo):
    """Benchmark pure mathematical forecasting functions without DB overhead."""
    as_of = 1792195200
    reachability_rows = await seeded_repo.read("pred_avalanche_reachability", service_id=None)
    cp_rows = await seeded_repo.read("pred_avalanche_customer_paths", service_id=None)
    collision_rows = await seeded_repo.read("pred_temporal_collisions", as_of=as_of, horizon_s=30 * 86400)

    # 1. Benchmark Avalanche Centrality computation
    ac_samples: list[float] = []
    for _ in range(N_ITERATIONS):
        t0 = time.perf_counter()
        ac_items = compute_avalanche_centrality(reachability_rows, cp_rows)
        ac_samples.append((time.perf_counter() - t0) * 1000.0)
        assert len(ac_items) > 0

    ac_stats = compute_quantiles(ac_samples)
    print(
        f"\n[BENCH] math:compute_avalanche_centrality: "
        f"p50={ac_stats['p50']}ms, p95={ac_stats['p95']}ms, max={ac_stats['max']}ms"
    )
    assert ac_stats["p95"] < LATENCY_P95_MAX_MS

    # 2. Benchmark Temporal Collisions computation
    col_samples: list[float] = []
    for _ in range(N_ITERATIONS):
        t0 = time.perf_counter()
        col_items = compute_temporal_collisions(collision_rows, window_days=7)
        col_samples.append((time.perf_counter() - t0) * 1000.0)
        assert col_items is not None

    col_stats = compute_quantiles(col_samples)
    print(
        f"\n[BENCH] math:compute_temporal_collisions: "
        f"p50={col_stats['p50']}ms, p95={col_stats['p95']}ms, max={col_stats['max']}ms"
    )
    assert col_stats["p95"] < LATENCY_P95_MAX_MS


# -----------------------------------------------------------------------------
# 3. Full Prediction Simulation Engine Benchmark
# -----------------------------------------------------------------------------
async def test_benchmark_full_prediction_simulation_engine_under_100ms(seeded_repo):
    """Benchmark end-to-end run_prediction_simulation over N=30 iterations."""
    as_of = 1792195200

    for horizon_days in (7, 30, 90):
        # Warmup
        for _ in range(WARMUP_ITERATIONS):
            await run_prediction_simulation(seeded_repo, as_of=as_of, horizon_days=horizon_days)

        samples: list[float] = []
        for _ in range(N_ITERATIONS):
            t0 = time.perf_counter()
            forecast = await run_prediction_simulation(
                seeded_repo, as_of=as_of, horizon_days=horizon_days
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            samples.append(elapsed_ms)
            assert len(forecast.avalanche_centrality) > 0
            assert len(forecast.canvas_decorations) > 0

        stats = compute_quantiles(samples)
        print(
            f"\n[BENCH] run_prediction_simulation (horizon={horizon_days}d): "
            f"p50={stats['p50']}ms, p95={stats['p95']}ms, max={stats['max']}ms"
        )
        assert stats["p95"] < LATENCY_P95_MAX_MS, (
            f"Simulation p95 latency {stats['p95']}ms exceeded {LATENCY_P95_MAX_MS}ms budget!"
        )


async def test_benchmark_targeted_service_simulation_under_100ms(seeded_repo):
    """Benchmark targeted simulation focusing on a specific critical service."""
    as_of = 1792195200
    target_sid = "svc_payments_gateway"

    for _ in range(WARMUP_ITERATIONS):
        await run_prediction_simulation(
            seeded_repo, as_of=as_of, horizon_days=30, target_service_id=target_sid
        )

    samples: list[float] = []
    for _ in range(N_ITERATIONS):
        t0 = time.perf_counter()
        forecast = await run_prediction_simulation(
            seeded_repo, as_of=as_of, horizon_days=30, target_service_id=target_sid
        )
        samples.append((time.perf_counter() - t0) * 1000.0)
        assert any(it.service_id == target_sid for it in forecast.avalanche_centrality)

    stats = compute_quantiles(samples)
    print(
        f"\n[BENCH] run_prediction_simulation (targeted {target_sid}): "
        f"p50={stats['p50']}ms, p95={stats['p95']}ms, max={stats['max']}ms"
    )
    assert stats["p95"] < LATENCY_P95_MAX_MS


# -----------------------------------------------------------------------------
# 4. End-to-End HTTP API Simulation Endpoint Benchmark
# -----------------------------------------------------------------------------
async def test_benchmark_http_api_simulation_endpoint_under_100ms(live_ws):
    """Benchmark full HTTP GET /workspaces/{ws_id}/prediction/simulation over N=30 iterations."""
    client, ws_id, base = live_ws
    endpoint = f"{base}/prediction/simulation"

    # Warmup
    for _ in range(WARMUP_ITERATIONS):
        r = await client.get(endpoint, headers=TEST_AUTH_HEADER, params={"horizon_days": 30})
        assert r.status_code == 200

    samples: list[float] = []
    for _ in range(N_ITERATIONS):
        t0 = time.perf_counter()
        res = await client.get(endpoint, headers=TEST_AUTH_HEADER, params={"horizon_days": 30})
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        samples.append(elapsed_ms)

        assert res.status_code == 200
        data = res.json()
        assert "avalanche_centrality" in data
        assert "temporal_collisions" in data
        assert "canvas_decorations" in data
        assert len(data["avalanche_centrality"]) > 0

    stats = compute_quantiles(samples)
    print(
        f"\n[BENCH] HTTP GET /prediction/simulation: "
        f"p50={stats['p50']}ms, p95={stats['p95']}ms, max={stats['max']}ms"
    )
    assert stats["p95"] < LATENCY_P95_MAX_MS, (
        f"HTTP API simulation p95 latency {stats['p95']}ms exceeded {LATENCY_P95_MAX_MS}ms budget!"
    )
