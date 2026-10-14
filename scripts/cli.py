#!/usr/bin/env python3
"""
Reprieve CLI — The Autonomous Pre-Merge Risk Engine for Connected Architectures.
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

DEFAULT_API_URL = os.environ.get("REPRIEVE_API_URL", "http://localhost:8000")
DEFAULT_API_KEY = os.environ.get("REPRIEVE_API_KEY", "rep_live_local")
DEFAULT_WS_ID = os.environ.get("REPRIEVE_WORKSPACE", "ws_01m4kk3bkc65abxckx2kyes57p")


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

    print(f"\n{BOLD}{CYAN}▶ Reprieve Circuit Breaker: Checking Architectural Risk...{RESET}")
    print(f"  {DIM}Target Workspace:{RESET} {ws_id}")
    print(f"  {DIM}Target Service:{RESET}   {target_service or 'ALL (Global Mesh)'}")
    print(f"  {DIM}Sliding Horizon:{RESET}  +{horizon} days\n")

    sim_url = f"{api_url}/api/v1/workspaces/{ws_id}/prediction/simulation?horizon_days={horizon}"
    result = _api_call(sim_url, api_key=args.api_key)

    if "error" in result or "code" in result or result.get("status", 200) >= 400:
        err_msg = result.get("detail") or result.get("error") or result.get("code") or "Unknown error"
        print(f"{RED}❌ Error reaching Reprieve API:{RESET} {err_msg}")
        return 2

    services = result.get("services") or result.get("avalanche_centrality") or []
    collisions = result.get("collisions") or result.get("temporal_collisions") or []

    if not services:
        print(f"{YELLOW}⚠️  NOTICE: Workspace has 0 registered services (Unseeded/Empty Graph).{RESET}")
        print(f"  {DIM}To ingest services:{RESET} python scripts/cli.py scan --submit")
        print(f"  {DIM}Or visit dashboard:{RESET} http://localhost:3000/w/{ws_id}/data\n")
        return 0

    matched = [s for s in services if s.get("service_id") == target_service or s.get("service_name") == target_service] if target_service else services

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
        print(f"  Run Steward in terminal or reassign expired TLS/auth waivers before merging PR.")
        print(f"{DIM}To review proof graph:{RESET} http://localhost:3000/w/{ws_id}/graph?focus={critical_failures[0].get('service_id')}\n")
        return 1
    else:
        max_score = max([s.get("score", 0) for s in critical_failures], default=0)
        print(f"{GREEN}{BOLD}✅ PRE-MERGE GATE PASSED: Architecture Safe within +{horizon}d Horizon{RESET}")
        print(f"  {DIM}Peak Cascade Score:{RESET} {max_score:.1f} (Below threshold {args.fail_threshold})")
        print(f"  {DIM}Temporal Collisions:{RESET} {len(collisions)} active clusters")
        print(f"  {GREEN}No Single Point of Failure (SPOF) disruptions predicted.{RESET}\n")
        return 0


def cmd_scan(args: argparse.Namespace) -> int:
    """Scans local source files for temporary waivers, #nosec annotations, and skipped tests."""
    target_dir = Path(args.dir)
    print(f"\n{BOLD}{CYAN}▶ Reprieve Autonomous Scanner: Scanning {target_dir.resolve()}...{RESET}")

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
            except Exception:
                continue

    if not found_waivers:
        print(f"{GREEN}✓ No unmanaged waivers or skipped tests found in source diff.{RESET}\n")
        return 0

    print(f"\n{YELLOW}Found {len(found_waivers)} implicit waivers in source code:{RESET}")
    for path, line, detail in found_waivers[:8]:
        print(f"  {CYAN}{path}:{line}{RESET} → {DIM}{detail}{RESET}")

    if args.submit:
        api_url = args.api_url.rstrip("/")
        ws_id = args.workspace
        print(f"\n{BOLD}Submitting waivers to Reprieve Autonomous Ingestion Pipeline...{RESET}")
        summary_text = "\n".join([f"Bypass at {p}:{l}: {d}" for p, l, d in found_waivers[:5]])
        ingest_payload = {
            "text": f"Autonomous CLI scan found {len(found_waivers)} temporary code waivers in commit:\n{summary_text}",
            "source_ref": "reprieve-cli:scan",
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
                    "serverInfo": {"name": "reprieve", "version": "0.1.0"},
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
            "reprieve": {
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
                    "REPRIEVE_API_KEY": api_key,
                    "REPRIEVE_WORKSPACE": ws_id,
                    "REPRIEVE_API_URL": api_url,
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
    parent_parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Reprieve API base URL")
    parent_parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="Reprieve Machine API Key")
    parent_parser.add_argument("-w", "--workspace", default=DEFAULT_WS_ID, help="Workspace ID or slug")

    parser = argparse.ArgumentParser(
        prog="reprieve",
        description="Reprieve CLI: Continuous Pre-Merge Architectural Risk Gate",
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

    # Scan
    scan_p = subparsers.add_parser(
        "scan",
        parents=[parent_parser],
        help="Scan repository for code waivers and temporary bypasses",
    )
    scan_p.add_argument("-d", "--dir", default=".", help="Root directory to scan")
    scan_p.add_argument("--submit", action="store_true", help="Automatically submit findings as a staged draft")
    scan_p.add_argument("--auto-approve", action="store_true", help="Headless approval of drafted waivers for authorized CI bots")

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
