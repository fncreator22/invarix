"""Tier 4: Real-World Application Scenarios (Authoritative Northwind Dataset).

Verifies:
- Full Northwind graph simulation and SPOF ranking on payments_gateway & checkout_api.
- Cascade failure probability propagation to customer ingress points.
- 100% recall on planted ground truth scenarios (S1–S5).
- Zero false positives on control services.
- Deterministic owner-resolution accuracy.
"""

import json
import sys
from pathlib import Path

import pytest
from falkordb.asyncio import FalkorDB

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.detection.config import preset
from app.detection.engine import run_rules
from app.graph.repo import Repo
from app.prediction.engine import run_prediction_simulation

GT = json.loads((ROOT / "data" / "ground_truth.json").read_text())


# =============================================================================
# Real-World Scenario: Northwind Pay Architecture Simulation
# =============================================================================

@pytest.mark.asyncio
async def test_northwind_spof_ranking_and_cascade_probability(seeded_org_repo: Repo):
    """Verify Avalanche Centrality SPOF ranking on payments_gateway & checkout_api and cascade probability to ingress."""
    as_of = GT["as_of"]
    forecast = await run_prediction_simulation(seeded_org_repo, as_of=as_of, horizon_days=30)

    assert forecast is not None
    assert len(forecast.avalanche_centrality) >= 5

    # Look up critical services
    ac_by_id = {item.service_id: item for item in forecast.avalanche_centrality}
    
    assert "svc_payments_gateway" in ac_by_id, "Payments Gateway must be present in simulation forecast"
    assert "svc_checkout_api" in ac_by_id, "Checkout API must be present in simulation forecast"

    pg = ac_by_id["svc_payments_gateway"]
    co = ac_by_id["svc_checkout_api"]

    # 1. SPOF & Risk Band Verification: Payments Gateway must be a critical SPOF
    assert pg.spof_rank > 0, f"Payments Gateway must be an identified SPOF, got {pg.spof_rank}"
    assert pg.score >= 75.0, f"Payments Gateway score {pg.score} < 75.0 (expected CRITICAL band)"
    assert pg.band == "critical"
    assert co.spof_rank > 0, f"Checkout API must be an identified SPOF, got {co.spof_rank}"
    assert co.score >= 35.0

    # 2. Cascade Probability Verification: full cascade to customer ingress paths
    assert pg.cascade_probability >= 0.70, f"Payments Gateway cascade prob {pg.cascade_probability} < 0.70"
    assert "svc_checkout_api" in pg.reachable_services
    assert "cp_checkout" in pg.customer_paths
    assert co.cascade_probability >= 0.50, f"Checkout API cascade prob {co.cascade_probability} < 0.50"

    # 4. Control services verification: control services must not be top SPOFs
    for c_id in GT["control_services"]:
        if c_id in ac_by_id:
            c_item = ac_by_id[c_id]
            assert c_item.band == "low" or c_item.score < 25.0
            assert c_item.spof_rank == 0 or c_item.spof_rank > 5


@pytest.mark.asyncio
async def test_northwind_planted_scenarios_ground_truth_recall(seeded_org_repo: Repo):
    """Verify 100% recall on planted ground truth scenarios (S1-S5) and 0 false positives on controls."""
    as_of = GT["as_of"]
    cfg = preset()
    res = await run_rules(seeded_org_repo, cfg, as_of)

    got = {(f.rule_id, f.subject_id) for f in res.findings}

    # 1. Recall on all scenarios
    scenarios_evaluated = []
    for s in GT["scenarios"]:
        all_expected_found = all((e["rule"], e["subject"]) in got for e in s["expect"])
        scenarios_evaluated.append((s["id"], s["name"], all_expected_found))

    missed = [f"{sid} ({name})" for sid, name, ok in scenarios_evaluated if not ok]
    assert len(missed) == 0, f"Missed ground truth scenarios: {missed}"

    # 2. False positives on control services
    controls = set(GT["control_services"])
    fps = [
        f.key
        for f in res.findings
        if f.subject_id in controls or controls & {n["id"] for n in f.proof_json["nodes"]}
    ]
    assert len(fps) == 0, f"False positive findings on control services: {fps}"

    # 3. Critical service bands from scoring
    for crit_svc in GT["critical_services"]:
        assert crit_svc in res.scores, f"Critical service {crit_svc} missing from rule scores"
        assert res.scores[crit_svc]["band"] == "critical", (
            f"Service {crit_svc} scored as {res.scores[crit_svc]['band']}, expected 'critical'"
        )

    # 4. Control service bands from scoring
    for ctrl_svc in GT["control_services"]:
        assert ctrl_svc in res.scores, f"Control service {ctrl_svc} missing from rule scores"
        assert res.scores[ctrl_svc]["band"] == "low", (
            f"Control service {ctrl_svc} scored as {res.scores[ctrl_svc]['band']}, expected 'low'"
        )


@pytest.mark.asyncio
async def test_northwind_owner_resolution_accuracy(seeded_org_repo: Repo):
    """Verify deterministic owner resolution accuracy against ground truth targets."""
    as_of = GT["as_of"]
    for case in GT["owner_resolution"]:
        exc_id = case["exception"]
        expected_owner = case["expected_first"]

        rows = await seeded_org_repo.read("owner_candidates", exception_id=exc_id, as_of=as_of)
        assert len(rows) > 0, f"No candidate owners returned for {exc_id}"
        resolved_owner = rows[0]["person_id"]
        assert resolved_owner == expected_owner, (
            f"Owner resolution mismatch for {exc_id}: got {resolved_owner}, expected {expected_owner}"
        )


@pytest.mark.asyncio
async def test_northwind_temporal_collision_clusters_detection(seeded_org_repo: Repo):
    """Verify future temporal collisions clustering on Northwind dataset."""
    as_of = GT["as_of"]
    forecast = await run_prediction_simulation(seeded_org_repo, as_of=as_of, horizon_days=30)
    
    assert len(forecast.temporal_collisions) >= 1
    top_cluster = forecast.temporal_collisions[0]
    assert top_cluster.severity_score > 0.0
    assert len(top_cluster.affected_services) >= 1
    assert len(top_cluster.exception_ids) >= 1
    assert len(top_cluster.proof.nodes) >= 1
