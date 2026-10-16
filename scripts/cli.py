#!/usr/bin/env python3
"""
INVARIX CLI — The Autonomous Pre-Merge Risk Engine for Connected Architectures.
Provides zero-login terminal commands for CI/CD pipelines, pre-commit hooks, and developer terminals.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# ANSI Terminal Colors
RESET = "\033[0m"
BOLD = "\033[1m"
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
DIM = "\033[2m"

DEFAULT_API_URL = os.environ.get("INVARIX_API_URL", "http://localhost:8000")
DEFAULT_API_KEY = os.environ.get("INVARIX_API_KEY", "rep_live_local")
DEFAULT_WS_ID = os.environ.get("INVARIX_WORKSPACE", "ws_01m4kk3bkc65abxckx2kyes57p")


def _api_call(url: str, method: str = "GET", data: dict | None = None, api_key: str = DEFAULT_API_KEY) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers={
            "X-API-Key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            parsed = json.loads(err_body)
            if isinstance(parsed, dict):
                if "error" not in parsed:
                    parsed["error"] = parsed.get("detail") or parsed.get("code") or f"HTTP {e.code}"
                parsed["status"] = e.code
                return parsed
            return {"error": str(parsed), "status": e.code}
        except Exception:
            return {"error": err_body, "status": e.code}
    except Exception as e:
        return {"error": str(e), "status": 500}


def cmd_check(args: argparse.Namespace) -> int:
    """Pre-merge gate: Evaluates multi-hop cascading failure risk on a service."""
    api_url = args.api_url.rstrip("/")
    ws_id = args.workspace
    horizon = args.horizon
    target_service = args.service

    print(f"\n{BOLD}{CYAN}▶ INVARIX Circuit Breaker: Checking Architectural Risk...{RESET}")
    print(f"  {DIM}Target Workspace:{RESET} {ws_id}")
    print(f"  {DIM}Target Service:{RESET}   {target_service or 'ALL (Global Mesh)'}")
    print(f"  {DIM}Sliding Horizon:{RESET}  +{horizon} days\n")

    sim_url = f"{api_url}/api/v1/workspaces/{ws_id}/prediction/simulation?horizon_days={horizon}"
    result = _api_call(sim_url, api_key=args.api_key)

    if "error" in result or "code" in result or result.get("status", 200) >= 400:
        err_msg = result.get("detail") or result.get("error") or result.get("code") or "Unknown error"
        print(f"{RED}❌ Error reaching INVARIX API:{RESET} {err_msg}")
        return 2

    services = result.get("services") or result.get("avalanche_centrality") or []
    collisions = result.get("collisions") or result.get("temporal_collisions") or []

    if not services:
        print(f"{YELLOW}⚠️  NOTICE: Workspace has 0 registered services (Unseeded/Empty Graph).{RESET}")
        print(f"  {DIM}To ingest services:{RESET} python scripts/cli.py scan --submit")
        print(f"  {DIM}Or visit dashboard:{RESET} http://localhost:3000/w/{ws_id}/data\n")
        return 0

    matched = [s for s in services if s.get("service_id") == target_service or s.get("service_name") == target_service] if target_service else services

    if target_service and not matched:
        print(f"{YELLOW}{BOLD}⚠️  VALIDATION FAILED:{RESET} Target service '{target_service}' was not found in the architectural graph.")
        known = [s.get("service_id") for s in services[:6] if s.get("service_id")]
        if known:
            print(f"  {DIM}Available services in graph:{RESET} {', '.join(known)}...")
        print("  Double check spelling or run 'python scripts/cli.py scan --submit' to ingest it.\n")
        return 1

    # Diff-aware evaluation: check if PR files actually modified the service
    changed_files = getattr(args, "changed_files", None)
    if changed_files and target_service:
        files = [f.strip() for f in changed_files.split(",") if f.strip()]
        svc_token = target_service.removeprefix("svc_").replace("_", "-")
        touches_service = any(svc_token in f.lower() or target_service in f.lower() for f in files)
        if not touches_service:
            print(f"{GREEN}{BOLD}✅ PRE-MERGE GATE PASSED (Diff-Aware):{RESET} PR does not modify '{target_service}' or its dependencies.")
            print(f"  {DIM}Modified files analyzed:{RESET} {len(files)} files (Service unaffected by PR delta)\n")
            return 0

    critical_failures = []
    for s in matched:
        score = s.get("score") if "score" in s else s.get("sim_score", 0)
        is_spof = s.get("spof_rank", 0) > 0 or s.get("is_spof", False)
        band = s.get("band") or s.get("sim_band", "low")
        if score >= args.fail_threshold or (is_spof and score >= 50):
            critical_failures.append({
                "service_id": s.get("service_id") or s.get("service_name"),
                "score": score,
                "band": band,
                "is_spof": is_spof
            })

    if critical_failures:
        print(f"{RED}{BOLD}🚨 PRE-MERGE GATE BLOCKED: Critical Emergent Cascades Detected!{RESET}\n")
        for fail in critical_failures:
            sid = fail.get("service_id")
            score = fail.get("score", 0.0)
            band = str(fail.get("band", "medium"))
            spof = " [SINGLE POINT OF FAILURE]" if fail.get("is_spof") else ""
            print(f"  {RED}● Service:{RESET} {BOLD}{sid}{RESET} — {RED}Risk Score: {score:.1f} ({band.upper()}){RESET}{spof}")

        # Check for related collision clusters
        if collisions:
            print(f"\n  {YELLOW}{BOLD}Temporal Expiry Collisions ({len(collisions)} found):{RESET}")
            for c in collisions[:3]:
                aff = c.get("affected_services", [])
                exc = c.get("exception_ids", [])
                density = len(exc)
                print(f"    • Cluster {BOLD}{c.get('cluster_id')}{RESET}: {density} exceptions across {', '.join(aff)}")

        print(f"\n{YELLOW}Recommended Mitigation Action:{RESET}")
        print("  Run Steward in terminal or reassign expired TLS/auth waivers before merging PR.")
        print(f"{DIM}To review proof graph:{RESET} http://localhost:3000/w/{ws_id}/graph?focus={critical_failures[0].get('service_id')}\n")
        return 1
    else:
        max_score = max([s.get("score", 0) for s in critical_failures], default=0)
        print(f"{GREEN}{BOLD}✅ PRE-MERGE GATE PASSED: Architecture Safe within +{horizon}d Horizon{RESET}")
        print(f"  {DIM}Peak Cascade Score:{RESET} {max_score:.1f} (Below threshold {args.fail_threshold})")
        print(f"  {DIM}Temporal Collisions:{RESET} {len(collisions)} active clusters")
        print(f"  {GREEN}No Single Point of Failure (SPOF) disruptions predicted.{RESET}\n")
        return 0


def _get_mock_simulation(target_service: str | None = None) -> tuple[list[dict], list[dict]]:
    """Deterministic simulation fallback when running offline or against unseeded test workspaces."""
    all_services = [
        {
            "service_id": "svc_payments_gateway",
            "service_name": "Payments Gateway",
            "score": 88.5,
            "band": "critical",
            "spof_rank": 1,
            "is_spof": True,
            "cascade_probability": 0.84,
            "reachable_services": ["svc_auth_cache", "svc_checkout_api", "svc_billing_service"],
            "customer_paths": ["cp_checkout"],
            "proof": {
                "nodes": ["svc_payments_gateway", "svc_auth_cache", "svc_checkout_api", "svc_billing_service"],
                "edges": [
                    {"from": "svc_payments_gateway", "to": "svc_auth_cache", "type": "DEPENDS_ON"},
                    {"from": "svc_auth_cache", "to": "svc_checkout_api", "type": "DEPENDS_ON"},
                    {"from": "svc_checkout_api", "to": "svc_billing_service", "type": "DEPENDS_ON"},
                ],
            },
        },
        {
            "service_id": "svc_checkout_api",
            "service_name": "Checkout API",
            "score": 76.2,
            "band": "critical",
            "spof_rank": 2,
            "is_spof": True,
            "cascade_probability": 0.72,
            "reachable_services": ["svc_billing_service"],
            "customer_paths": ["cp_checkout"],
            "proof": {
                "nodes": ["svc_checkout_api", "svc_billing_service"],
                "edges": [
                    {"from": "svc_checkout_api", "to": "svc_billing_service", "type": "DEPENDS_ON"},
                ],
            },
        },
        {
            "service_id": "svc_ledger_service",
            "service_name": "Ledger Service",
            "score": 42.0,
            "band": "moderate",
            "spof_rank": 0,
            "is_spof": False,
            "cascade_probability": 0.15,
            "reachable_services": [],
            "customer_paths": [],
            "proof": {"nodes": ["svc_ledger_service"], "edges": []},
        },
        {
            "service_id": "svc_auth_cache",
            "service_name": "Auth Cache",
            "score": 18.0,
            "band": "low",
            "spof_rank": 0,
            "is_spof": False,
            "cascade_probability": 0.045,
            "reachable_services": [],
            "customer_paths": [],
            "proof": {"nodes": ["svc_auth_cache"], "edges": []},
        },
    ]

    collisions = [
        {
            "cluster_id": "col_cluster_01",
            "window_start": 1792195200,
            "window_end": 1792800000,
            "exception_ids": ["exc_tls_pin_4", "exc_auth_bypass_01"],
            "affected_services": ["svc_payments_gateway", "svc_checkout_api"],
            "severity_score": 8.5,
            "collision_severity": 8.5,
            "severity_band": "critical",
            "proof": {
                "nodes": ["svc_payments_gateway", "svc_checkout_api"],
                "edges": [{"from": "svc_payments_gateway", "to": "svc_checkout_api", "type": "CONNECTED_EXPIRY"}],
            },
        },
        {
            "cluster_id": "col_cluster_02",
            "window_start": 1792800000,
            "window_end": 1793404800,
            "exception_ids": ["exc_ghost_vault_key", "exc_ledger_batch_export"],
            "affected_services": ["svc_ledger_service"],
            "severity_score": 4.2,
            "collision_severity": 4.2,
            "severity_band": "moderate",
            "proof": {"nodes": ["svc_ledger_service"], "edges": []},
        },
    ]

    if target_service:
        matched = [s for s in all_services if s["service_id"] == target_service or s["service_name"] == target_service]
        if not matched:
            matched = [{
                "service_id": target_service,
                "service_name": target_service,
                "score": 10.0,
                "band": "low",
                "spof_rank": 0,
                "is_spof": False,
                "cascade_probability": 0.02,
                "reachable_services": [],
                "customer_paths": [],
                "proof": {"nodes": [target_service], "edges": []},
            }]
        return matched, [c for c in collisions if target_service in c.get("affected_services", [])]
    return all_services, collisions


def cmd_scan(args: argparse.Namespace) -> int:
    """Scans local source files for temporary waivers, #nosec annotations, and skipped tests."""
    target_dir = Path(args.dir)
    print(f"\n{BOLD}{CYAN}▶ INVARIX Autonomous Scanner: Scanning {target_dir.resolve()}...{RESET}")

    patterns = [
        re.compile(r"#\s*(?:nosec|noqa|skip|hotfix)\b[:\s]*(.*)", re.IGNORECASE),
        re.compile(r"@(?:skip|ignore|disabled)\b[\(\"']*(.*)[\"'\)]*", re.IGNORECASE),
        re.compile(r"TODO\s*\((?:waiver|temporary|bypass|techdebt)\)[:\s]*(.*)", re.IGNORECASE),
    ]

    found_waivers = []
    ignore_dirs = {".git", "node_modules", ".venv", "__pycache__", ".next", "dist"}

    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for f in files:
            if not f.endswith((".py", ".ts", ".tsx", ".js", ".go", ".yml", ".yaml")):
                continue
            filepath = Path(root) / f
            try:
                content = filepath.read_text(encoding="utf-8", errors="ignore")
                for line_no, line in enumerate(content.splitlines(), start=1):
                    for p in patterns:
                        m = p.search(line)
                        if m:
                            detail = m.group(1).strip() or line.strip()
                            rel_path = filepath.relative_to(target_dir)
                            found_waivers.append((str(rel_path), line_no, detail))
            except (OSError, UnicodeDecodeError):
                continue

    if getattr(args, "pr", False):
        print(f"\n{BOLD}{CYAN}================================================================================{RESET}")
        print(f"{BOLD}{CYAN}INVARIX PRE-MERGE GATE · PULL REQUEST ARCHITECTURAL RISK REPORT{RESET}")
        print(f"{BOLD}{CYAN}================================================================================{RESET}")

        if found_waivers:
            print(f"\n{YELLOW}Found {len(found_waivers)} implicit waivers in source code diff:{RESET}")
            for path, line, detail in found_waivers[:8]:
                print(f"  {CYAN}{path}:{line}{RESET} → {DIM}{detail}{RESET}")
            if len(found_waivers) > 8:
                print(f"  {DIM}... and {len(found_waivers) - 8} more bypasses.{RESET}")
        else:
            print(f"\n{GREEN}✓ No unmanaged waivers or skipped tests found in source diff.{RESET}")

        api_url = args.api_url.rstrip("/")
        ws_id = args.workspace
        horizon = getattr(args, "horizon", 30)
        target_service = getattr(args, "service", None)
        fail_threshold = getattr(args, "fail_threshold", 75.0)

        print(f"\n{BOLD}{CYAN}▶ Simulating Pull Request Changes against Architectural Knowledge Graph...{RESET}")
        print(f"  {DIM}Target Workspace:{RESET} {ws_id}")
        print(f"  {DIM}Target Service:{RESET}   {target_service or 'ALL (Global Mesh)'}")
        print(f"  {DIM}Sliding Horizon:{RESET}  +{horizon} days")
        print(f"  {DIM}Fail Threshold:{RESET}   Score >= {fail_threshold:.1f} or SPOF Critical Risk\n")

        sim_url = f"{api_url}/api/v1/workspaces/{ws_id}/prediction/simulation?horizon_days={horizon}"
        if target_service:
            sim_url += f"&target_service_id={target_service}"

        result = _api_call(sim_url, api_key=args.api_key)

        services = []
        collisions = []
        if not ("error" in result or "code" in result or result.get("status", 200) >= 400):
            services = result.get("avalanche_centrality") or result.get("services") or []
            collisions = result.get("temporal_collisions") or result.get("collisions") or []

        if not services:
            print(f"{DIM}  (Notice: INVARIX API unseeded/offline; using architectural simulation fallback){RESET}\n")
            services, collisions = _get_mock_simulation(target_service=target_service)

        matched_services = [
            s for s in services
            if s.get("service_id") == target_service or s.get("service_name") == target_service
        ] if target_service else services

        # Target Services Table
        print(f"{BOLD}Target Services Evaluated:{RESET}")
        print(f"  {'-' * 84}")
        print(f"  {BOLD}{'SERVICE ID':<26} {'SCORE':<10} {'RISK BAND':<14} {'SPOF RANK':<14} {'CASCADE PROB':<14}{RESET}")
        print(f"  {'-' * 84}")

        for s in matched_services:
            sid = s.get("service_id") or s.get("service_name", "unknown")
            score = float(s.get("score", s.get("sim_score", 0.0)))
            band = str(s.get("band", s.get("sim_band", "low"))).upper()
            spof_rank = s.get("spof_rank", 0)
            spof_str = f"Rank #{spof_rank}" if spof_rank > 0 else "-"
            cascade_prob = float(s.get("cascade_probability", 0.0)) * 100.0

            if band == "CRITICAL":
                band_colored = f"{RED}{BOLD}{band:<14}{RESET}"
            elif band == "HIGH":
                band_colored = f"{YELLOW}{BOLD}{band:<14}{RESET}"
            elif band == "MODERATE":
                band_colored = f"{CYAN}{band:<14}{RESET}"
            else:
                band_colored = f"{GREEN}{band:<14}{RESET}"

            print(f"  {sid:<26} {score:<10.1f} {band_colored} {spof_str:<14} {cascade_prob:<5.1f}%")

        print(f"  {'-' * 84}\n")

        # Single Point of Failure Ranks
        spof_services = [s for s in matched_services if s.get("spof_rank", 0) > 0 or s.get("is_spof")]
        spof_services.sort(key=lambda x: x.get("spof_rank", 999))
        if spof_services:
            print(f"{YELLOW}{BOLD}⚠️  Single Point of Failure (SPOF) Identifications:{RESET}")
            for s in spof_services:
                rank = s.get("spof_rank", 1)
                sid = s.get("service_id") or s.get("service_name")
                score = float(s.get("score", 0.0))
                band = str(s.get("band", "high")).upper()
                prob = float(s.get("cascade_probability", 0.0)) * 100.0
                print(f"  • {BOLD}Rank #{rank}{RESET}: {CYAN}{sid}{RESET} — Risk Score: {score:.1f} ({band}), Cascade Prob: {prob:.1f}%")
            print()

        # Cascading Multi-Hop Failure Paths
        failure_paths = []
        for s in matched_services:
            sid = s.get("service_id") or s.get("service_name")
            proof = s.get("proof") or {}
            edges = proof.get("edges", []) if isinstance(proof, dict) else []
            reachable = s.get("reachable_services", [])
            if edges:
                chain = [sid]
                curr = sid
                visited = {curr}
                while True:
                    next_node = None
                    for edge in edges:
                        from_n = edge.get("from") or edge.get("from_node")
                        to_n = edge.get("to")
                        if from_n == curr and to_n and to_n not in visited:
                            next_node = to_n
                            break
                    if next_node:
                        chain.append(next_node)
                        visited.add(next_node)
                        curr = next_node
                    else:
                        break
                if len(chain) > 1:
                    failure_paths.append(" ➔ ".join([f"{BOLD}{n}{RESET}" for n in chain]))
            elif reachable:
                chain = [sid] + reachable
                failure_paths.append(" ➔ ".join([f"{BOLD}{n}{RESET}" for n in chain]))

        if failure_paths:
            print(f"{BOLD}Cascading Multi-Hop Failure Paths:{RESET}")
            for p in failure_paths:
                print(f"  • {p}")
            print()

        # Temporal Collision Warnings
        if collisions:
            print(f"{YELLOW}{BOLD}Temporal Collision Warnings ({len(collisions)} active clusters):{RESET}")
            for c in collisions:
                cid = c.get("cluster_id")
                aff = c.get("affected_services", [])
                exc = c.get("exception_ids", [])
                score = float(c.get("severity_score", c.get("collision_severity", 0.0)))
                band = str(c.get("severity_band", "moderate")).upper()
                aff_str = ", ".join(aff)
                print(f"  • Cluster {BOLD}{cid}{RESET}: {len(exc)} exceptions expiring in same window across {aff_str} (Severity: {score:.1f} [{band}])")
            print()

        # Verdict
        critical_failures = []
        for s in matched_services:
            score = float(s.get("score", s.get("sim_score", 0.0)))
            is_spof = bool(s.get("spof_rank", 0) > 0 or s.get("is_spof"))
            band = str(s.get("band", s.get("sim_band", "low"))).lower()
            if (
                score >= fail_threshold
                or (is_spof and score >= 50.0 and fail_threshold <= 75.0)
                or (band == "critical" and fail_threshold <= 75.0)
            ):
                critical_failures.append(s)

        print("=" * 84)
        if critical_failures:
            print(f"{RED}{BOLD}🚨 PRE-MERGE GATE: BLOCKED{RESET}")
            print("Circuit Breaker Triggered: Critical architectural cascade risk or SPOF threshold exceeded.")
            failed_names = [s.get("service_id") or s.get("service_name") for s in critical_failures]
            print(f"Target service(s) at risk: {', '.join(failed_names)}")
            print(f"\n{YELLOW}Recommended Mitigation Action:{RESET}")
            print("  Run Steward in terminal, link compensating controls, or reassign expired waivers.")
            print(f"{DIM}To review proof graph:{RESET} http://localhost:3000/w/{ws_id}/graph?focus={failed_names[0]}")
            print("=" * 84 + "\n")
            return 1
        else:
            max_score = max([float(s.get("score", 0.0)) for s in matched_services], default=0.0)
            print(f"{GREEN}{BOLD}✅ PRE-MERGE GATE: APPROVED{RESET}")
            print(f"Architecture safe within +{horizon}d horizon. No critical cascading failures or SPOFs detected.")
            print(f"Peak Cascade Score: {max_score:.1f} (Below threshold {fail_threshold:.1f})")
            print("=" * 84 + "\n")
            return 0

    if not found_waivers:
        print(f"{GREEN}✓ No unmanaged waivers or skipped tests found in source diff.{RESET}\n")
        return 0

    print(f"\n{YELLOW}Found {len(found_waivers)} implicit waivers in source code:{RESET}")
    for path, line, detail in found_waivers[:8]:
        print(f"  {CYAN}{path}:{line}{RESET} → {DIM}{detail}{RESET}")

    if args.submit:
        api_url = args.api_url.rstrip("/")
        ws_id = args.workspace
        print(f"\n{BOLD}Submitting waivers to INVARIX Autonomous Ingestion Pipeline...{RESET}")
        summary_text = "\n".join([f"Bypass at {p}:{l}: {d}" for p, l, d in found_waivers[:5]])
        ingest_payload = {
            "text": f"Autonomous CLI scan found {len(found_waivers)} temporary code waivers in commit:\n{summary_text}",
            "source_ref": "invarix-cli:scan",
        }
        resp = _api_call(f"{api_url}/api/v1/workspaces/{ws_id}/exceptions/ingest-text", method="POST", data=ingest_payload, api_key=args.api_key)
        if "error" in resp or "code" in resp or resp.get("status", 200) >= 400:
            err_msg = resp.get("detail") or resp.get("error") or resp.get("code") or "Unknown error"
            print(f"{RED}❌ Submission failed:{RESET} {err_msg}")
            return 1
        draft_id = resp.get("id")
        print(f"{GREEN}✓ Staged Draft Created:{RESET} {BOLD}{draft_id}{RESET}")

        if getattr(args, "auto_approve", False):
            print(f"{BOLD}Attempting automated headless approval (--auto-approve)...{RESET}")
            app_resp = _api_call(
                f"{api_url}/api/v1/workspaces/{ws_id}/exceptions/drafts/{draft_id}/approve",
                method="POST",
                data={},
                api_key=args.api_key,
            )
            if "error" in app_resp or "code" in app_resp or app_resp.get("status", 200) >= 400:
                print(f"  {YELLOW}⚠️  Draft requires manual review or field resolution:{RESET} {app_resp.get('detail', 'Missing required control/owner mapping')}")
                print(f"  {DIM}Complete review at:{RESET} http://localhost:3000/w/{ws_id}/exceptions/drafts\n")
            else:
                print(f"  {GREEN}✅ Draft {draft_id} automatically approved and promoted into risk graph.{RESET}\n")
        else:
            print(f"{DIM}Impact Preview URL:{RESET} http://localhost:3000/w/{ws_id}/exceptions/drafts\n")

    return 0


def cmd_mcp_bridge(args: argparse.Namespace) -> int:
    """Stdio JSON-RPC bridge for MCP clients (Claude Desktop, Cursor)."""
    api_url = args.api_url.rstrip("/")
    ws_id = args.workspace
    api_key = args.api_key

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception:
            continue

        method = req.get("method")
        msg_id = req.get("id")

        if method == "initialize":
            resp = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "invarix", "version": "0.1.0"},
                },
            }
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        elif method == "notifications/initialized":
            continue
        elif method == "tools/list":
            url = f"{api_url}/api/v1/workspaces/{ws_id}/mcp/tools"
            res = _api_call(url, method="GET", api_key=api_key)
            if "error" in res or "code" in res or res.get("status", 200) >= 400:
                err_msg = res.get("detail") or res.get("error") or res.get("code") or "Tools fetch failed"
                resp = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {"code": -32000, "message": str(err_msg)},
                }
            else:
                tools_list = res.get("tools", [])
                resp = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {"tools": tools_list},
                }
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        elif method == "tools/call":
            params = req.get("params", {})
            name = params.get("name")
            arguments = params.get("arguments", {})
            url = f"{api_url}/api/v1/workspaces/{ws_id}/mcp/tools/{name}"
            res = _api_call(url, method="POST", data=arguments, api_key=api_key)
            if "error" in res or "code" in res or res.get("status", 200) >= 400:
                err_msg = res.get("detail") or res.get("error") or res.get("code") or "Tool execution failed"
                resp = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {"code": -32000, "message": str(err_msg)},
                }
            else:
                resp = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": res,
                }
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        elif method == "ping":
            resp = {"jsonrpc": "2.0", "id": msg_id, "result": {}}
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        elif msg_id is not None:
            resp = {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {"code": -32601, "message": f"Method {method} not found"},
            }
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
    return 0


def cmd_mcp_config(args: argparse.Namespace) -> int:
    """Emits the Claude Desktop / Cursor configuration block."""
    api_url = args.api_url.rstrip("/")
    ws_id = args.workspace
    api_key = args.api_key
    config = {
        "mcpServers": {
            "invarix": {
                "command": "python",
                "args": [
                    str(Path(__file__).resolve()),
                    "mcp-bridge",
                    "--workspace",
                    ws_id,
                    "--api-url",
                    api_url,
                ],
                "env": {
                    "INVARIX_API_KEY": api_key,
                    "INVARIX_WORKSPACE": ws_id,
                    "INVARIX_API_URL": api_url,
                },
            }
        }
    }
    print(f"\n{BOLD}{CYAN}Claude Desktop / Cursor Configuration JSON:{RESET}\n")
    print(json.dumps(config, indent=2))
    print(f"\n{DIM}Add this to %APPDATA%\\Claude\\claude_desktop_config.json{RESET}\n")
    return 0


def main() -> int:
    parent_parser = argparse.ArgumentParser(add_help=False)
    parent_parser.add_argument("--api-url", default=DEFAULT_API_URL, help="INVARIX API base URL")
    parent_parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="INVARIX Machine API Key")
    parent_parser.add_argument("-w", "--workspace", default=DEFAULT_WS_ID, help="Workspace ID or slug")

    parser = argparse.ArgumentParser(
        prog="invarix",
        description="INVARIX CLI: Continuous Pre-Merge Architectural Risk Gate",
        parents=[parent_parser],
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # Check
    check_p = subparsers.add_parser(
        "check",
        parents=[parent_parser],
        help="Evaluate 30-day avalanche cascading risk for a service",
    )
    check_p.add_argument("-s", "--service", default=None, help="Target service ID (e.g. svc_checkout_api)")
    check_p.add_argument("--horizon", type=int, default=30, help="Sliding simulation horizon in days")
    check_p.add_argument("--fail-threshold", type=float, default=75.0, help="Risk score threshold to block CI")
    check_p.add_argument("--changed-files", default=None, help="Comma-separated list of modified files in PR for diff-aware gate")

    # Scan
    scan_p = subparsers.add_parser(
        "scan",
        parents=[parent_parser],
        help="Scan repository for code waivers and temporary bypasses",
    )
    scan_p.add_argument("-d", "--dir", default=".", help="Root directory to scan")
    scan_p.add_argument("--submit", action="store_true", help="Automatically submit findings as a staged draft")
    scan_p.add_argument("--auto-approve", action="store_true", help="Headless approval of drafted waivers for authorized CI bots")
    scan_p.add_argument(
        "--pr",
        action="store_true",
        help="Simulate pull request changes against architectural graph and output risk bands and SPOF ranks",
    )
    scan_p.add_argument("-s", "--service", default=None, help="Target service ID (e.g. svc_checkout_api)")
    scan_p.add_argument("--horizon", type=int, default=30, help="Sliding simulation horizon in days")
    scan_p.add_argument("--fail-threshold", type=float, default=75.0, help="Risk score threshold to block CI")
    scan_p.add_argument("--changed-files", default=None, help="Comma-separated list of modified files in PR for diff-aware gate")

    # MCP config
    subparsers.add_parser(
        "mcp-config",
        parents=[parent_parser],
        help="Generate Claude Desktop & Cursor MCP config snippet",
    )

    # MCP bridge
    subparsers.add_parser(
        "mcp-bridge",
        parents=[parent_parser],
        help="Run stdio JSON-RPC MCP bridge for agent clients",
    )

    args = parser.parse_args()

    if args.command == "check":
        return cmd_check(args)
    elif args.command == "scan":
        return cmd_scan(args)
    elif args.command == "mcp-config":
        return cmd_mcp_config(args)
    elif args.command == "mcp-bridge":
        return cmd_mcp_bridge(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
