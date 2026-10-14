"""Eval harness (06 T-071 & Predictive Company Brain R1-R4):
Recall on planted scenarios, false positives on control services, score calibration,
owner-resolution accuracy, rule latency, predictive engine accuracy, and <100ms predictive p95 latency.
Writes eval/report.md. Run from backend/: `uv run python ../eval/run_eval.py`.
"""

import asyncio
import json
import os
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from falkordb.asyncio import FalkorDB  # noqa: E402

from app.detection.config import preset  # noqa: E402
from app.detection.engine import run_rules  # noqa: E402
from app.graph.repo import Repo  # noqa: E402
from app.graph.schema import ORG, ensure_schema  # noqa: E402
from app.ingest.loaders import load_bundle, read_bundle  # noqa: E402
from app.prediction.engine import run_prediction_simulation  # noqa: E402

GT = json.loads((ROOT / "data" / "ground_truth.json").read_text())
RULE_QUERIES = [
    "rule_r1_expiring",
    "rule_r2_orphaned_owner",
    "rule_r3_shared_fallback",
    "radius_paths",
    "rule_r5_renewal_chain",
    "rule_r6_collision_team",
    "rule_r7_broken_comp_control",
    "rule_r8_customer_path",
]

PREDICT_QUERIES = [
    ("pred_avalanche_reachability", {"service_id": None}),
    ("pred_avalanche_customer_paths", {"service_id": None}),
    ("pred_temporal_collisions", {"as_of": GT["as_of"], "horizon_s": 30 * 86400}),
]


async def main() -> int:
    db = FalkorDB(host=os.getenv("FALKORDB_HOST", "localhost"), port=int(os.getenv("FALKORDB_PORT", "6379")))
    repo = Repo(db, "eval_org")
    await repo.drop()
    repo = Repo(db, "eval_org")
    await ensure_schema(repo, ORG)
    t = time.monotonic()
    await load_bundle(repo, read_bundle(), source="sample")
    load_s = time.monotonic() - t
    cfg, as_of = preset(), GT["as_of"]

    # 1. Detection engine evaluation
    t = time.monotonic()
    res = await run_rules(repo, cfg, as_of)
    run_s = time.monotonic() - t
    got = {(f.rule_id, f.subject_id) for f in res.findings}
    scen = [
        (s["id"], s["name"], all((e["rule"], e["subject"]) in got for e in s["expect"]))
        for s in GT["scenarios"]
    ]
    controls = set(GT["control_services"])
    fps = [
        f.key
        for f in res.findings
        if f.subject_id in controls or controls & {n["id"] for n in f.proof_json["nodes"]}
    ]
    crit = {s: res.scores[s]["band"] for s in GT["critical_services"]}
    low = {s: res.scores[s]["band"] for s in controls}

    # 2. Owner resolution evaluation
    owners = []
    for case in GT["owner_resolution"]:
        rows = await repo.read("owner_candidates", exception_id=case["exception"], as_of=as_of)
        owners.append((case["exception"], rows[0]["person_id"] if rows else None, case["expected_first"]))

    # 3. Detection rules latency benchmarks
    lat = {}
    params = {
        "as_of": as_of,
        "window_s": 7 * 86400,
        "k": 3,
        "horizon_s": 30 * 86400,
        "max_age_s": 30 * 86400,
        "missing_min_severity": 3,
    }
    for q in RULE_QUERIES:
        text = (ROOT / "backend/app/graph/queries" / f"{q}.cypher").read_text()
        needed = {k: v for k, v in params.items() if f"${k}" in text}
        samples = []
        for _ in range(20):
            t = time.monotonic()
            await repo.read(q, **needed)
            samples.append((time.monotonic() - t) * 1000)
        lat[q] = statistics.quantiles(samples, n=20)[18]

    # 4. Predictive Cypher queries latency benchmarks (assert < 100ms)
    pred_lat: dict[str, float] = {}
    for q, qparams in PREDICT_QUERIES:
        samples = []
        for _ in range(20):
            t = time.monotonic()
            await repo.read(q, **qparams)
            samples.append((time.monotonic() - t) * 1000)
        pred_lat[q] = statistics.quantiles(samples, n=20)[18]

    # 5. Predictive simulation engine execution & forecast benchmarks
    sim_samples = []
    forecast_30 = None
    for _ in range(20):
        t0 = time.perf_counter()
        forecast_30 = await run_prediction_simulation(repo, as_of=as_of, horizon_days=30)
        sim_samples.append((time.perf_counter() - t0) * 1000)
    sim_p95 = statistics.quantiles(sim_samples, n=20)[18]

    # Verify forecast accuracy on seeded graph
    assert forecast_30 is not None
    spof_ok = len(forecast_30.avalanche_centrality) >= 5 and any(
        it.spof_rank == 1 and it.score > 0 for it in forecast_30.avalanche_centrality
    )
    col_ok = len(forecast_30.temporal_collisions) >= 1
    decorations_ok = len(forecast_30.canvas_decorations) >= 5

    await repo.drop()
    await db.aclose()

    recall = sum(ok for *_, ok in scen)
    owner_ok = sum(got_ == exp for _, got_, exp in owners)
    pred_queries_pass = all(v < 100.0 for v in pred_lat.values())
    sim_pass = sim_p95 < 100.0 and spof_ok and col_ok and decorations_ok

    passed = (
        recall == len(scen)
        and not fps
        and all(b == "critical" for b in crit.values())
        and all(b == "low" for b in low.values())
        and owner_ok == len(owners)
        and max(lat.values()) < 200
        and run_s < 3
        and pred_queries_pass
        and sim_pass
    )

    lines = [
        "# Eval report",
        "",
        f"Dataset: Northwind Pay sample, as of {as_of}. Result: **{'PASS' if passed else 'FAIL'}**",
        "",
        "| Metric | Result | Target |",
        "| --- | --- | --- |",
        f"| Recall on planted scenarios | {recall}/{len(scen)} | {len(scen)}/{len(scen)} |",
        f"| False positives on control services | {len(fps)} | 0 |",
        f"| Critical services in critical band | {sum(b == 'critical' for b in crit.values())}/{len(crit)} | all |",
        f"| Control services in low band | {sum(b == 'low' for b in low.values())}/{len(low)} | all |",
        f"| Owner-resolution accuracy | {owner_ok}/{len(owners)} | 100% |",
        f"| p95 rule query latency (max) | {max(lat.values()):.1f} ms | < 200 ms |",
        f"| p95 predictive query latency (max) | {max(pred_lat.values()):.1f} ms | < 100 ms |",
        f"| p95 full simulation forecast | {sim_p95:.1f} ms | < 100 ms |",
        f"| Avalanche SPOF ranking verified | {'PASS' if spof_ok else 'FAIL'} | PASS |",
        f"| Temporal collision clusters verified | {'PASS' if col_ok else 'FAIL'} | PASS |",
        f"| Full detection run | {run_s * 1000:.0f} ms | < 3 s |",
        f"| Sample load | {load_s * 1000:.0f} ms | < 30 s |",
        f"| Alerts produced | {len(res.findings)} | — |",
        "",
        "## Scenarios",
        "",
        *[f"- {i} {n}: {'detected' if ok else 'MISSED'}" for i, n, ok in scen],
        "",
        "## p95 latency per rule query",
        "",
        *[f"- `{q}`: {v:.1f} ms" for q, v in lat.items()],
        "",
        "## p95 latency per predictive query & simulation",
        "",
        *[f"- `{q}`: {v:.1f} ms" for q, v in pred_lat.items()],
        f"- `run_prediction_simulation (30d)`: {sim_p95:.1f} ms",
        "",
        "Groundedness is enforced per answer by `agents/guard.py` and covered by "
        "`backend/tests/test_conversational_grounding.py`.",
    ]
    (ROOT / "eval" / "report.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:19]))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
