import json
from typing import Any

from app.graph.repo import Repo
from app.ids import new_id, now


async def audit(
    org: Repo,
    *,
    actor_kind: str,
    actor_id: str | None,
    action: str,
    target_kind: str | None = None,
    target_id: str | None = None,
    summary: str = "",
    diff: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> None:
    await org.write(
        "audit_write",
        id=new_id("aud"),
        at=now(),
        actor_kind=actor_kind,
        actor_id=actor_id,
        action=action,
        target_kind=target_kind,
        target_id=target_id,
        summary=summary,
        diff_json=json.dumps(diff) if diff else None,
        request_id=request_id,
    )
