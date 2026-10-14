"""Quick answers: deterministic Steward answers that work with AI off or down (FR-STW-10, T-045)."""

from typing import Any

from app.agents import tools
from app.agents.guard import ground
from app.auth.deps import WorkspaceContext
from app.errors import ApiError


async def top_risk(ctx: WorkspaceContext) -> dict[str, Any]:
    ranked = await tools.call(ctx, tools.list_risk_services, tools.Limit(limit=5))
    top = ranked.data[0]
    detail = await tools.call(ctx, tools.explain_service, tools.ServiceArg(service_id=top["service"]["id"]))
    lines = [
        f"**{top['service']['label']}** carries the most risk right now: score {top['score']:.0f} "
        f"({top['band']}) `{top['service']['id']}`."
    ]
    for c in detail.data["breakdown"]["contributions"][:3]:
        name = detail.data.get("names", {}).get(c["exception_id"], c["exception_id"])
        where = "on this service" if c["hops"] == 0 else f"{c['hops']} hop{'s' if c['hops'] > 1 else ''} away"
        lines.append(f"- {name} `{c['exception_id']}` contributes {c['value']:.1f} ({where})")
    if len(ranked.data) > 1:
        rest = ", ".join(f"{r['service']['label']} {r['score']:.0f} `{r['service']['id']}`" for r in ranked.data[1:4])
        lines.append(f"\nNext: {rest}.")
    known = {**ranked.known, **detail.known}
    return _answer("\n".join(lines), known, detail.proof_paths, ["list_risk_services", "explain_service"])


async def owner(ctx: WorkspaceContext, exception_id: str) -> dict[str, Any]:
    res = await tools.call(ctx, tools.find_current_owner, tools.ExceptionArg(exception_id=exception_id))
    if not res.data:
        raise ApiError("NOT_FOUND", "No accountable person found.")
    lines = [f"Route `{exception_id}` to:"]
    lines += [f"{c['rank']}. {c['person']['label']} `{c['person']['id']}` — {c['reason']}" for c in res.data[:4]]
    res.known.setdefault(exception_id, exception_id)
    return _answer("\n".join(lines), res.known, [], ["find_current_owner"])


def _answer(md: str, known: dict[str, str], proofs: list[dict[str, Any]], used: list[str]) -> dict[str, Any]:
    clean, citations, removed = ground(md, known)
    return {
        "answer_markdown": clean,
        "citations": citations,
        "proof_paths": proofs,
        "proposed_actions": [],
        "used_tools": used,
        "removed_claims": removed,
    }
