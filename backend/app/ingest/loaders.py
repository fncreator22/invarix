"""Load a v1 JSON bundle (03 §13.2) into an org graph. Idempotent (MERGE), batched ≤ 500 rows."""

import json
from pathlib import Path
from typing import Any

from app.graph.repo import Repo
from app.ids import now

SAMPLE_BUNDLE = Path(__file__).resolve().parents[3] / "data" / "seed" / "northwind.json"

_STEPS = [
    ("teams", "load_teams"),
    ("people", "load_people"),
    ("memberships", "load_memberships"),
    ("leads", "load_leads"),
    ("services", "load_services"),
    ("dependencies", "load_dependencies"),
    ("customer_paths", "load_customer_paths"),
    ("controls", "load_controls"),
    ("runbooks", "load_runbooks"),
    ("compensating_controls", "load_compensating_controls"),
    ("exceptions", "load_exceptions"),
    ("evidence", "load_evidence"),
    ("renewals", "load_renewals"),
]


def read_bundle(path: Path = SAMPLE_BUNDLE) -> dict[str, Any]:
    bundle = json.loads(path.read_text())
    if bundle.get("bundle_version") != 1:
        raise ValueError("unsupported bundle_version")
    return bundle


async def load_bundle(repo: Repo, bundle: dict[str, Any], *, source: str, actor: str = "system") -> None:
    common: dict[str, Any] = {"source": source, "now": now(), "actor": actor}
    for key, qid in _STEPS:
        rows = bundle.get(key) or []
        if rows:
            await repo.write_batched(qid, rows, **common)
    links = [
        {"exception_id": e["id"], "cc_id": c}
        for e in bundle.get("exceptions", [])
        for c in e.get("compensating_control_ids", [])
    ]
    if links:
        await repo.write_batched("load_exception_ccs", links)
