"""Deterministic hint → ID resolution (03 §12.3): exact, normalized, then token matching. The LLM never picks IDs."""

import re
from typing import Any

from app.ingest.extractor import ExtractedException, PersonHint


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def _tokens(s: str) -> set[str]:
    return {t for t in norm(s).split() if len(t) > 2}


def _name_match(n: str, people: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Unique exact match, else unique first-name/prefix match."""
    exact = [p for p in people if norm(p["name"]) == n]
    if len(exact) == 1:
        return exact[0]
    partial = [p for p in people if n and (n in norm(p["name"]).split() or norm(p["name"]).startswith(n))]
    return partial[0] if len(partial) == 1 else None


def resolve_person(hint: PersonHint | None, people: list[dict[str, Any]]) -> tuple[str | None, str | None]:
    """→ (person_id, unresolved message)."""
    if not hint or not (hint.name or hint.email):
        return None, None
    active = [p for p in people if p.get("status") == "active"]
    if hint.email:
        for p in active:
            if (p.get("email") or "").lower() == hint.email.lower():
                return p["id"], None
    if hint.name:
        n = norm(hint.name)
        match = _name_match(n, active)
        if match:
            return match["id"], None
        gone = _name_match(n, [p for p in people if p.get("status") != "active"])
        if gone:
            return None, f"{gone['name']} has left; pick a current owner"
    who = hint.name or hint.email
    return None, f'Person "{who}" not found; pick a person'


def resolve_services(hints: list[str], services: list[dict[str, Any]]) -> tuple[list[str], list[str]]:
    ids, unresolved = [], []
    by_norm = {norm(s["name"]): s["id"] for s in services}
    for h in hints:
        n = norm(h)
        sid = by_norm.get(n) or by_norm.get(n.replace(" service", "").replace(" api", " api").strip())
        if not sid:
            cands = [s["id"] for s in services if n and (n in norm(s["name"]) or norm(s["name"]) in n)]
            sid = cands[0] if len(cands) == 1 else None
        if sid and sid not in ids:
            ids.append(sid)
        elif not sid:
            unresolved.append(f'Service "{h}" not found; pick a service')
    return ids, unresolved


def resolve_control(hint: str | None, controls: list[dict[str, Any]]) -> tuple[str | None, str | None]:
    if not hint:
        return None, "No waived control identified; pick one"
    for c in controls:
        if norm(c["name"]) == norm(hint):
            return c["id"], None
    want = _tokens(hint)
    scored = sorted(
        ((len(want & _tokens(c["name"] + " " + (c.get("description") or ""))), c["id"]) for c in controls), reverse=True
    )
    if scored and scored[0][0] >= 1 and (len(scored) == 1 or scored[0][0] > scored[1][0]):
        return scored[0][1], None
    return None, f'Control "{hint}" is ambiguous; pick one'


def resolve(
    x: ExtractedException, people: list[dict[str, Any]], services: list[dict[str, Any]], controls: list[dict[str, Any]]
) -> dict[str, Any]:
    owner_id, owner_msg = resolve_person(x.owner_hint, people)
    approver_id, _ = resolve_person(x.approver_hint, people)
    service_ids, svc_msgs = resolve_services(x.service_hints, services)
    control_id, ctl_msg = resolve_control(x.control_hint, controls)
    unresolved = {}
    if not owner_id:
        unresolved["owner_id"] = owner_msg or "No owner identified; pick a person"
    if not service_ids:
        unresolved["service_ids"] = "; ".join(svc_msgs) or "No affected service identified; pick one"
    if not control_id:
        unresolved["control_id"] = ctl_msg or "Pick the waived control"
    if not x.duration_days:
        unresolved["expires_at"] = "No expiry found; defaulted to 30 days (F8). Confirm it."
    return {
        "owner_id": owner_id,
        "approver_id": approver_id,
        "service_ids": service_ids,
        "control_id": control_id,
        "unresolved": unresolved,
    }
