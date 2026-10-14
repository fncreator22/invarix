"""Memory graph: built-in playbooks, review outcomes, precedent recall (03 §6.1, FR-MEM-01/02)."""

import json
from typing import Any

from app.graph.repo import Repo

PLAYBOOKS = [
    {
        "id": "pbk_owner_orphaned",
        "name": "Owner orphaned",
        "trigger_rule_id": "R2",
        "steps": [
            "Route the review to the current team lead",
            "Notify the original approver that ownership has lapsed",
            "If no team lead exists, escalate to workspace admin",
            "Update the exception owner field before the next sentinel tick",
        ],
    },
    {
        "id": "pbk_renewal_treadmill",
        "name": "Renewal treadmill",
        "trigger_rule_id": "R5",
        "steps": [
            "Require a written remediation rationale before allowing the next renewal",
            "Escalate at chain length 3 or more",
            "Propose a hard expiry date with no further renewals",
        ],
    },
    {
        "id": "pbk_single_fallback",
        "name": "Single fallback",
        "trigger_rule_id": "R3",
        "steps": [
            "Propose a second fallback person or runbook as a CompensatingControl",
            "If the fallback person also owns another exception, run predict_avalanche",
            "Add a review reminder 7 days before the nearest expiry in the cluster",
        ],
    },
    {
        "id": "pbk_avalanche_cascade",
        "name": "Avalanche cascade warning",
        "trigger_rule_id": "R4",
        "steps": [
            "Surface the Avalanche Centrality score and proof path to the on-call reviewer",
            "Run proof_path between the SPOF service and its highest-severity dependent",
            "Ask: What happens in 30 days if we don't act? to get the full cascade forecast",
            "Propose reviews for all exceptions touching the SPOF service",
            "Write a HandoffTask in the memory graph so the next on-call agent inherits the cascade context",
        ],
    },
    {
        "id": "pbk_expiry_collision_storm",
        "name": "Expiry collision storm",
        "trigger_rule_id": "R6",
        "steps": [
            "Display the collision window timeline to the reviewer (start date, end date, affected exceptions)",
            "Propose staggered renewals: no more than 1 exception per service in the same 7-day window",
            "Identify which exceptions can be closed vs which genuinely need renewal",
            "Escalate immediately if collision_score >= 25",
        ],
    },
    {
        "id": "pbk_orphaned_draft_high_sev",
        "name": "Orphaned high-severity draft",
        "trigger_rule_id": "R1",
        "steps": [
            "Send a review reminder to all reviewer and admin role members",
            "Show the impact preview panel for the draft",
            "Auto-reject after 72 hours of no reviewer action and write a Fact node in memory",
        ],
    },
]


async def seed_playbooks(mem: Repo) -> None:
    rows = [{**{k: v for k, v in p.items() if k != "steps"}, "steps_json": json.dumps(p["steps"])} for p in PLAYBOOKS]
    await mem.write("mem_playbooks_seed", rows=rows)


async def record_outcome(mem: Repo, **fields: Any) -> None:
    await mem.write("mem_outcome_write", **fields)


async def precedent(mem: Repo, control_id: str, service_id: str | None, limit: int = 5) -> list[dict[str, Any]]:
    rows = await mem.read(
        "precedent", control_key=f"Control:{control_id}", service_key=f"Service:{service_id or ''}", limit=limit
    )
    return [
        {
            "outcome_id": r["id"],
            "decision": r["decision"],
            "note": r["note"],
            "decided_at": r["decided_at"],
            "same_service": r["same_service"],
            "renewal_depth": r["renewal_depth"],
            "exception_id": r["exception_id"],
        }
        for r in rows
    ]
