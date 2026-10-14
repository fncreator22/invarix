"""Run rules R1–R8, score services, and turn results into alert specs. No LLM, no writes (02 §6 rule 1)."""

import hashlib
import json
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from app.detection import algorithms
from app.detection.config import DetectionConfig
from app.detection.proof import Proof, dependency_path, hydrate
from app.detection.scoring import score_services
from app.graph.repo import Repo
from app.ids import DAY

Names = dict[str, str]
PROOF_CAP = 5  # proof paths stay minimal; `involved` lists every contributor


@dataclass
class Finding:
    rule_id: str
    key: str
    subject_kind: str
    subject_id: str
    involved: list[str]
    severity: str
    reason_code: str
    proof: Proof
    text: Callable[[Names], tuple[str, str]]  # names → (title, summary)
    score: float | None = None
    breakdown: dict[str, Any] | None = None
    # filled after hydration
    title: str = ""
    summary: str = ""
    proof_json: dict[str, Any] = field(default_factory=dict)

    @property
    def fingerprint(self) -> str:
        return hashlib.sha1(self.key.encode()).hexdigest()

    @property
    def alert_id(self) -> str:
        return "alt_" + self.fingerprint[:24]


@dataclass
class DetectionResult:
    as_of: int
    findings: list[Finding]
    scores: dict[str, dict[str, Any]]
    evaluated_rules: list[str]


def _shortest(
    rows: list[dict[str, Any]], key: Callable[[dict[str, Any]], tuple[str, str]]
) -> dict[tuple[str, str], list[str]]:
    best: dict[tuple[str, str], list[str]] = {}
    for r in rows:
        k = key(r)
        if (
            k not in best
            or len(r["path_ids"]) < len(best[k])
            or (len(r["path_ids"]) == len(best[k]) and r["path_ids"] < best[k])
        ):
            best[k] = r["path_ids"]
    return best


def _plural(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"



async def run_rules(repo: Repo, cfg: DetectionConfig, as_of: int) -> DetectionResult:
    p = cfg.params
    on = cfg.enabled
    findings: list[Finding] = []

    if "R1" in on:
        for r in await repo.read("rule_r1_expiring", as_of=as_of, window_s=p["R1"]["window_days"] * DAY):
            e, reason = r["exception_id"], r["reason"]
            days = round((r["expires_at"] - as_of) / DAY)

            def r1_text(n: Names, e=e, reason=reason, days=days) -> tuple[str, str]:
                if reason == "expired":
                    return f"{n[e]} expired {abs(days)} days ago", "The exception is past its expiry but still active."
                if reason == "condition_met":
                    return f"{n[e]}: validity condition met", "Its closing condition is now true; review for closure."
                return f"{n[e]} expires in {_plural(days, 'day')}", "Renew, revoke or close it before it lapses."

            findings.append(
                Finding(
                    "R1",
                    f"R1|{e}|{reason}",
                    "Exception",
                    e,
                    [e],
                    "high" if reason == "expired" else "moderate",
                    reason,
                    Proof("").add(e, "WAIVES", r["control_id"]),
                    r1_text,
                )
            )

    if "R2" in on:
        for r in await repo.read("rule_r2_orphaned_owner", as_of=as_of):
            e, o = r["exception_id"], r["owner_id"]
            proof = Proof("").add(e, "OWNED_BY", o)
            cands = await repo.read("owner_candidates", exception_id=e, as_of=as_of)
            if cands:
                c = cands[0]
                proof.add(e, "AFFECTS", c["service_id"]).add(c["team_id"], "OWNS", c["service_id"])
                proof.add(c["person_id"], "LEADS", c["team_id"])

            def r2_text(n: Names, e=e, o=o, reason=r["reason"]) -> tuple[str, str]:
                verb = "has left the company" if reason == "left" else "no longer works on the owning team"
                return f"{n[e]} has no active owner", f"Recorded owner {n[o]} {verb}."

            findings.append(Finding("R2", f"R2|{e}|{o}", "Exception", e, [e], "high", r["reason"], proof, r2_text))

    r3_exceptions: set[str] = set()
    if "R3" in on:
        k = p["R3"]["k"]
        for r in await repo.read("rule_r3_shared_fallback", k=k):
            x, exs = r["dependency_id"], r["exception_ids"]
            proof = Proof("")
            for e, c in sorted(r["pairs"]):
                proof.add(e, "COMPENSATED_BY", c).add(c, "RELIES_ON", x)
            r3_exceptions |= set(exs)
            sev = "critical" if len(exs) >= k + 2 or (r["max_severity"] or 0) >= 5 else "high"

            def r3_text(n: Names, x=x, cnt=len(exs)) -> tuple[str, str]:
                return (
                    f"{cnt} exceptions rely on {n[x]} as their only fallback",
                    f"If {n[x]} is unavailable, {cnt} compensating controls fail at once.",
                )

            findings.append(
                Finding("R3", f"R3|{x}", r["dependency_kind"], x, sorted(exs), sev, "shared_fallback", proof, r3_text)
            )

    # radius (R4 + scoring)
    rad_rows = await repo.read("radius_paths")
    radius: dict[str, dict[str, list[str]]] = {}
    for (s, e), path in _shortest(rad_rows, lambda r: (r["service_id"], r["exception_id"])).items():
        radius.setdefault(s, {})[e] = path

    if "R5" in on:
        k = p["R5"]["k"]
        for r in await repo.read("rule_r5_renewal_chain", k=k):
            e, chain = r["exception_id"], r["chain_ids"]
            proof = Proof("")
            for a, b in zip(chain, chain[1:], strict=False):
                proof.add(a, "RENEWS", b)
            proof.add(e, "WAIVES", r["control_id"])

            def r5_text(n: Names, e=e, c=r["control_id"], cl=r["chain_length"]) -> tuple[str, str]:
                return (
                    f"{n[c]} waived {cl} times in a row",
                    f"{n[e]} is renewal {cl} of the same waiver. Temporary is becoming permanent.",
                )

            findings.append(
                Finding(
                    "R5",
                    f"R5|{e}|{r['chain_length']}",
                    "Exception",
                    e,
                    list(chain),
                    "high" if r["chain_length"] >= k + 1 else "moderate",
                    "renewal_treadmill",
                    proof,
                    r5_text,
                )
            )

    r6_exceptions: set[str] = set()
    if "R6" in on:
        c6 = p["R6"]
        seen_teams: set[str] = set()
        for r in await repo.read(
            "rule_r6_collision_team",
            as_of=as_of,
            horizon_s=c6["horizon_days"] * DAY,
            window_s=c6["window_days"] * DAY,
            k=c6["k"],
        ):
            t = r["team_id"]
            if t in seen_teams:  # rows are ordered largest window first; keep one per team
                continue
            seen_teams.add(t)
            exs = set(r["exception_ids"])
            r6_exceptions |= exs
            proof = Proof("")
            for e, s in sorted(r["pairs"]):
                if e in exs:
                    proof.add(t, "OWNS", s).add(e, "AFFECTS", s)
            start_day = r["window_start"] // DAY

            def r6_text(n: Names, t=t, cnt=r["n"], w=c6["window_days"]) -> tuple[str, str]:
                return (
                    f"{cnt} exceptions owned by {n[t]} expire within {w} days",
                    "Reviews will pile up in the same week; schedule them now.",
                )

            findings.append(
                Finding("R6", f"R6|{t}|{start_day}", "Team", t, sorted(exs), "high", "expiry_collision", proof, r6_text)
            )

    if "R7" in on:
        c7 = p["R7"]
        for r in await repo.read(
            "rule_r7_broken_comp_control",
            as_of=as_of,
            max_age_s=c7["max_age_days"] * DAY,
            missing_min_severity=c7["missing_min_severity"],
        ):
            e = r["exception_id"]
            proof = Proof("").add(e, "WAIVES", r["control_id"])
            for c in r["bad_ids"]:
                proof.add(e, "COMPENSATED_BY", c)

            def r7_text(n: Names, e=e, reason=r["reason"]) -> tuple[str, str]:
                if reason == "missing":
                    return f"{n[e]} has no compensating control", "A severity 3+ exception should be mitigated."
                return (
                    f"{n[e]}: compensating control not verified",
                    "The mitigation failed or has not been checked recently.",
                )

            findings.append(
                Finding(
                    "R7",
                    f"R7|{e}|{r['reason']}",
                    "Exception",
                    e,
                    [e],
                    "high" if r["severity"] >= 4 else "moderate",
                    r["reason"],
                    proof,
                    r7_text,
                )
            )

    r8_services: set[str] = set()
    if "R8" in on:
        min_sev = p["R8"]["min_severity"]
        rows = [r for r in await repo.read("rule_r8_customer_path") if r["severity"] >= min_sev]
        sev_of = {r["exception_id"]: r["severity"] for r in rows}
        by_path: dict[str, dict[str, list[str]]] = {}
        for (cp, e), path in _shortest(rows, lambda r: (r["path_id"], r["exception_id"])).items():
            by_path.setdefault(cp, {})[e] = path
            r8_services |= set(path[1:-1])
        # F16: one alert per customer path (not per path × exception) to avoid alert fatigue
        for cp, paths in sorted(by_path.items()):
            ranked = sorted(paths, key=lambda e: (-sev_of[e], len(paths[e]), e))
            proof = Proof("")
            for e in ranked[:PROOF_CAP]:
                dependency_path(proof, paths[e], head_rel="REQUIRES")
            top = ranked[0]

            def r8_text(n: Names, cp=cp, top=top, cnt=len(paths)) -> tuple[str, str]:
                more = f" and {_plural(cnt - 1, 'other')}" if cnt > 1 else ""
                return (
                    f"{n[cp]} path depends on {_plural(cnt, 'active exception')}",
                    f"Customers on the {n[cp]} path rely on services carrying {n[top]}{more}.",
                )

            findings.append(
                Finding(
                    "R8",
                    f"R8|{cp}",
                    "CustomerPath",
                    cp,
                    sorted(paths),
                    "critical" if sev_of[top] >= 4 else "high",
                    "customer_path_exposure",
                    proof,
                    r8_text,
                )
            )

    # scoring + R4
    excs = {r["id"]: r for r in await repo.read("active_exceptions")}
    service_ids = sorted({r["service_id"] for r in await repo.read("service_degrees")})
    cent = await algorithms.centrality(repo, cfg.scoring["centrality"])
    scores = score_services(
        service_ids=service_ids,
        radius=radius,
        exceptions=excs,
        centrality=cent,
        r3_exceptions=r3_exceptions,
        r6_exceptions=r6_exceptions,
        r8_services=r8_services,
        cfg=cfg.scoring,
        as_of=as_of,
    )
    if "R4" in on:
        k = p["R4"]["k"]
        for s, paths in sorted(radius.items()):
            if len(paths) < k:
                continue
            sc = scores[s]
            proof = Proof("")
            for c in sc["contributions"][:PROOF_CAP]:  # strongest contributors first
                dependency_path(proof, paths[c["exception_id"]])

            def r4_text(n: Names, s=s, cnt=len(paths)) -> tuple[str, str]:
                return (
                    f"{_plural(cnt, 'active exception')} within two hops of {n[s]}",
                    f"{n[s]} and the services it depends on carry {_plural(cnt, 'active exception')}.",
                )

            findings.append(
                Finding(
                    "R4",
                    f"R4|{s}",
                    "Service",
                    s,
                    sorted(paths),
                    sc["band"],
                    "service_concentration",
                    proof,
                    r4_text,
                    score=sc["score"],
                    breakdown=sc,
                )
            )

    hydrated = await hydrate(repo, [f.proof for f in findings])
    names: Names = {n["id"]: n["name"] for h in hydrated for n in h["nodes"]}
    for f, h in zip(findings, hydrated, strict=True):
        f.title, f.summary = f.text(names)
        h["summary"] = f.summary
        f.proof_json = h
    return DetectionResult(as_of=as_of, findings=findings, scores=scores, evaluated_rules=sorted(on))


def alert_params(f: Finding, *, now: int, as_of: int) -> dict[str, Any]:
    return {
        "id": f.alert_id,
        "fingerprint": f.fingerprint,
        "rule_id": f.rule_id,
        "severity": f.severity,
        "score": f.score,
        "title": f.title,
        "summary": f.summary,
        "reason_code": f.reason_code,
        "proof_json": json.dumps(f.proof_json),
        "score_json": json.dumps(f.breakdown) if f.breakdown else None,
        "subject_kind": f.subject_kind,
        "subject_id": f.subject_id,
        "now": now,
        "as_of": as_of,
    }
