"""Constraint and index specs per graph kind, and the idempotent bootstrap (03 §6.2–6.3)."""

import asyncio
from dataclasses import dataclass

from app.graph.repo import Repo

SCHEMA_VERSION = 1


@dataclass(frozen=True)
class SchemaSpec:
    unique: tuple[tuple[str, str], ...]
    mandatory: tuple[tuple[str, str], ...]
    indexes: tuple[tuple[str, str], ...]


def _ids(labels: tuple[str, ...]) -> tuple[tuple[str, str], ...]:
    return tuple((label, "id") for label in labels)


PLATFORM_LABELS = ("User", "Workspace", "Invitation", "ApiKey")
PLATFORM = SchemaSpec(
    unique=_ids(PLATFORM_LABELS) + (("User", "clerk_user_id"), ("Workspace", "slug")),
    mandatory=(("User", "clerk_user_id"),)
    + _ids(("Workspace", "Invitation", "ApiKey")),  # F15: User merges on clerk id
    indexes=(("User", "email"), ("Invitation", "token_hash"), ("ApiKey", "prefix"), ("ApiKey", "secret_hash")),
)

ORG_ID_LABELS = (
    "Person",
    "Team",
    "Service",
    "Control",
    "Exception",
    "CompensatingControl",
    "Evidence",
    "CustomerPath",
    "Runbook",
    "Review",
    "Alert",
    "RiskSnapshot",
    "ImportJob",
    "AuditEvent",
    "Notification",
    "SentinelRun",
)
ORG = SchemaSpec(
    unique=_ids(ORG_ID_LABELS) + (("Alert", "fingerprint"), ("RuleConfig", "rule_id"), ("SchemaMeta", "key")),
    mandatory=_ids(ORG_ID_LABELS),  # F15: MANDATORY is checked at MERGE-create time, so only merge keys
    indexes=(
        ("Exception", "status"),
        ("Exception", "expires_at"),
        ("Exception", "kind"),
        ("Alert", "status"),
        ("Alert", "rule_id"),
        ("Review", "status"),
        ("Person", "status"),
        ("Person", "email"),
        ("Service", "name"),
        ("Notification", "recipient_user_id"),
        ("AuditEvent", "at"),
        ("SentinelRun", "started_at"),
    ),
)

MEM_ID_LABELS = ("Session", "Turn", "ReviewOutcome", "Fact", "Playbook", "HandoffTask")
MEM = SchemaSpec(
    unique=_ids(MEM_ID_LABELS) + (("Ref", "key"),),
    mandatory=_ids(MEM_ID_LABELS) + (("Ref", "key"),),
    indexes=(("Turn", "session_id"), ("ReviewOutcome", "decided_at"), ("HandoffTask", "status")),
)


async def ensure_schema(repo: Repo, spec: SchemaSpec) -> None:
    existing = await repo.indexed()
    unique_props = set(spec.unique)
    for label, prop in spec.indexes:
        if (label, prop) not in existing and (label, prop) not in unique_props:
            await repo.create_index(label, prop)
            existing.add((label, prop))
    have = {(c["type"], c["label"], tuple(c["properties"])) for c in await repo.constraints()}
    for kind, pairs in (("UNIQUE", spec.unique), ("MANDATORY", spec.mandatory)):
        for label, prop in pairs:
            if (kind, label, (prop,)) not in have:
                await repo.create_constraint(kind, label, prop)
    for _ in range(50):  # constraints build asynchronously
        if all(c["status"] == "OPERATIONAL" for c in await repo.constraints()):
            break
        await asyncio.sleep(0.1)
    else:
        raise RuntimeError(f"constraints not operational on {repo.graph_name}")
