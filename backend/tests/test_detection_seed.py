"""Ground-truth eval on the sample dataset (docs/07-seed-spec.md §4)."""

import json
import time
from pathlib import Path

import pytest

from app.detection.config import preset
from app.detection.engine import run_rules
from app.graph.schema import ORG, ensure_schema
from app.ingest.loaders import load_bundle, read_bundle

GT = json.loads((Path(__file__).resolve().parents[2] / "data" / "ground_truth.json").read_text())


@pytest.fixture
async def seeded(repo):
    await ensure_schema(repo, ORG)
    await load_bundle(repo, read_bundle(), source="sample")
    return repo


async def test_ground_truth(seeded):
    t = time.monotonic()
    res = await run_rules(seeded, preset(), GT["as_of"])
    elapsed = time.monotonic() - t
    got = {(f.rule_id, f.subject_id) for f in res.findings}
    expected = [(e["rule"], e["subject"]) for s in GT["scenarios"] for e in s["expect"]]
    missing = [x for x in expected if x not in got]
    assert not missing, missing
    controls = set(GT["control_services"])
    touching = [
        f.key for f in res.findings if f.subject_id in controls or controls & {n["id"] for n in f.proof_json["nodes"]}
    ]
    assert not touching, touching
    for s in GT["critical_services"]:
        assert res.scores[s]["band"] == "critical", (s, res.scores[s]["score"])
    for s in controls:
        assert res.scores[s]["band"] == "low", (s, res.scores[s]["score"])
    assert all(f.proof_json["edges"] for f in res.findings), "every alert needs a proof path"
    assert elapsed < 3, elapsed


async def test_deterministic(seeded):
    a = await run_rules(seeded, preset(), GT["as_of"])
    b = await run_rules(seeded, preset(), GT["as_of"])
    assert [(f.key, f.title, f.proof_json) for f in a.findings] == [(f.key, f.title, f.proof_json) for f in b.findings]
    assert a.scores == b.scores
