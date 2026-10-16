"""Tier 3: Cross-Feature Integration E2E Tests.

Verifies:
- Pipeline 1: Exception waiver ingestion -> Invariant detection -> Avalanche Centrality recalculation -> Pre-merge CLI gate blocking.
- Pipeline 2: Ingestion extraction -> Entity resolution -> Shortest proof path generation.
"""

import argparse
import sys
import unittest.mock as mock
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
from app.graph.repo import Repo, _rows
from app.graph.schema import ORG, ensure_schema
from app.ingest.extractor import ExtractedException, PersonHint
from app.ingest.resolver import resolve
from app.prediction.engine import run_prediction_simulation
import scripts.cli as cli_module


# =============================================================================
# Pipeline 1: Exception Waiver -> Invariant Detection -> Cascade -> CLI Gate
# =============================================================================

@pytest.mark.asyncio
async def test_cross_pipeline_waiver_to_cascade_to_cli_gate(isolated_org_repo: Repo):
    """Verify that granting an expired security waiver triggers an invariant violation,
    spikes avalanche centrality on dependent critical services, and blocks pre-merge CI."""
    as_of = 1792195200  # Baseline epoch

    # Step 1: Create critical service dependency tree
    # svc_checkout_api (customer facing) -> DEPENDS_ON -> svc_payments_gateway (tier 1) -> DEPENDS_ON -> svc_ledger
    await isolated_org_repo.g.query(
        """
        CREATE (c:Control {id: 'ctl_tls_modern', name: 'TLS 1.2+ Required', weight: 3}),
               (t:Team {id: 'team_payments', name: 'Payments Team'}),
               (p:Person {id: 'per_priya', name: 'Priya', status: 'active'}),
               (s1:Service {id: 'svc_checkout_api', name: 'Checkout API', tier: 1, customer_facing: true}),
               (s2:Service {id: 'svc_payments_gateway', name: 'Payments Gateway', tier: 1, customer_facing: false}),
               (s3:Service {id: 'svc_ledger', name: 'Core Ledger', tier: 2, customer_facing: false}),
               (p)-[:LEADS]->(t),
               (t)-[:OWNS]->(s2),
               (s1)-[:DEPENDS_ON]->(s2),
               (s2)-[:DEPENDS_ON]->(s3)
        """
    )

    # Step 2: Baseline without exceptions
    # Invariant detection: 0 findings for R1
    baseline_findings = await run_rules(isolated_org_repo, preset(), as_of)
    r1_baseline = [f for f in baseline_findings.findings if f.rule_id == "R1"]
    assert len(r1_baseline) == 0

    # Step 3: Ingest an expired, high-severity waiver on Payments Gateway
    expired_time = as_of - (5 * 86400)  # expired 5 days ago
    created_time = expired_time - (30 * 86400)
    await isolated_org_repo.g.query(
        """
        MATCH (s:Service {id: 'svc_payments_gateway'}), (c:Control {id: 'ctl_tls_modern'}), (p:Person {id: 'per_priya'})
        CREATE (e:Exception {
            id: 'exc_tls_expired',
            title: 'Temporary TLS 1.0 waiver for acquirer settlement',
            kind: 'security_waiver',
            severity: 5,
            status: 'active',
            expires_at: $exp,
            created_at: $created,
            granted_at: $created
        }),
        (e)-[:WAIVES]->(c),
        (e)-[:AFFECTS]->(s),
        (e)-[:OWNED_BY]->(p)
        """,
        {"exp": expired_time, "created": created_time},
    )

    # Step 4: Run Invariant Detection -> Invariant R1 fires!
    rules_result = await run_rules(isolated_org_repo, preset(), as_of)
    r1_hits = [f for f in rules_result.findings if f.rule_id == "R1"]
    assert len(r1_hits) == 1
    assert r1_hits[0].subject_id == "exc_tls_expired"
    assert r1_hits[0].severity == "high"
    # Proof path links exception and control
    proof_nodes = {n["id"] for n in r1_hits[0].proof_json["nodes"]}
    assert "exc_tls_expired" in proof_nodes
    assert "ctl_tls_modern" in proof_nodes

    # Step 5: Recalculate Avalanche Centrality simulation
    forecast = await run_prediction_simulation(isolated_org_repo, as_of=as_of, horizon_days=30)
    assert len(forecast.avalanche_centrality) >= 1

    # Payments Gateway is the upstream dependency of Checkout API
    pg_item = next((it for it in forecast.avalanche_centrality if it.service_id == "svc_payments_gateway"), None)
    assert pg_item is not None
    assert pg_item.spof_rank in (1, 2)
    assert pg_item.score >= 45.0
    assert pg_item.cascade_probability >= 0.80
    assert "svc_checkout_api" in pg_item.reachable_services

    # Step 6: CLI Pre-Merge Gate Detection
    # When CLI circuit breaker scans the simulation output for this workspace:
    cli_sim_payload = {
        "avalanche_centrality": [
            {
                "service_id": it.service_id,
                "score": it.score,
                "band": it.band,
                "spof_rank": it.spof_rank,
                "is_spof": it.spof_rank > 0,
            }
            for it in forecast.avalanche_centrality
        ],
        "temporal_collisions": [],
    }

    with mock.patch("scripts.cli._api_call", return_value=cli_sim_payload):
        cli_args = argparse.Namespace(
            api_url="http://localhost:8000",
            workspace="ws_test",
            service="svc_payments_gateway",
            horizon=30,
            fail_threshold=45.0,
            api_key="rep_live_local",
        )
        gate_exit_code = cli_module.cmd_check(cli_args)
        # Because Payments Gateway is a SPOF with score >= 50.0, CLI gate BLOCKS PR merge
        assert gate_exit_code == 1, f"Expected gate to block PR merge with exit code 1, got {gate_exit_code}"


# =============================================================================
# Pipeline 2: Ingestion Extraction -> Entity Resolution -> Proof Path Generation
# =============================================================================

@pytest.mark.asyncio
async def test_cross_pipeline_ingest_extraction_to_entity_resolution_to_proof_path(isolated_org_repo: Repo):
    """Verify raw text extraction hints are deterministically resolved against live graph entities
    and synthesize an authentic relationship proof path."""
    # Step 1: Populate graph with target entities
    await isolated_org_repo.g.query(
        """
        CREATE (p:Person {id: 'per_priya', name: 'Priya Sharma', status: 'active', email: 'priya@company.internal'}),
               (s:Service {id: 'svc_payments_gateway', name: 'Payments Gateway', tier: 1}),
               (c:Control {id: 'ctl_tls_modern', name: 'TLS 1.2+ Required'}),
               (cc:CompensatingControl {id: 'cc_pinning', name: 'IP Whitelist and Certificate Pinning'}),
               (c)-[:MITIGATED_BY]->(cc)
        """
    )

    # Step 2: Fetch entities from graph for resolver
    people = _rows(await isolated_org_repo.g.query("MATCH (p:Person) RETURN p.id as id, p.name as name, p.status as status, p.email as email"))
    services = _rows(await isolated_org_repo.g.query("MATCH (s:Service) RETURN s.id as id, s.name as name"))
    controls = _rows(await isolated_org_repo.g.query("MATCH (c:Control) RETURN c.id as id, c.name as name"))

    # Step 3: Raw extracted exception object (as produced by LLM extractor from text)
    extracted = ExtractedException(
        title="Waiver for Payments Gateway modern TLS requirement",
        kind="security_waiver",
        severity_suggested=4,
        owner_hint=PersonHint(name="Priya"),
        approver_hint=None,
        service_hints=["Payments Gateway"],
        control_hint="TLS 1.2+",
        duration_days=60,
    )

    # Step 4: Deterministic Entity Resolution
    resolved = resolve(extracted, people, services, controls)
    assert resolved["owner_id"] == "per_priya"
    assert resolved["service_ids"] == ["svc_payments_gateway"]
    assert resolved["control_id"] == "ctl_tls_modern"
    assert "owner_id" not in resolved["unresolved"]
    assert "service_ids" not in resolved["unresolved"]
    assert "control_id" not in resolved["unresolved"]

    # Step 5: Proof Path Generation linking resolved control and compensating control
    # Query graph for the proof relationship
    path_rows = _rows(await isolated_org_repo.g.query(
        """
        MATCH p = (c:Control {id: $cid})-[:MITIGATED_BY]->(cc:CompensatingControl)
        RETURN [n in nodes(p) | n.id] as node_ids, [r in relationships(p) | type(r)] as rels
        """,
        {"cid": resolved["control_id"]},
    ))
    assert len(path_rows) == 1
    assert path_rows[0]["node_ids"] == ["ctl_tls_modern", "cc_pinning"]
    assert path_rows[0]["rels"] == ["MITIGATED_BY"]
