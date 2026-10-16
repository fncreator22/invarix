"""Tests for Reprieve Pre-Merge CI CLI Gate (scripts/cli.py).

Validates:
1. `scripts/cli.py scan --pr` executes simulation and outputs risk bands and SPOF ranks.
2. Formatted reporting of multi-hop failure paths and temporal collisions.
3. Accurate exit codes (0 = Approved, 1 = Blocked on Critical/SPOF threshold).
4. `scripts/cli.py check` functionality.
5. Live HTTP API integration and offline simulation fallback paths.
"""

from __future__ import annotations

import json
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
CLI_SCRIPT = PROJECT_ROOT / "scripts" / "cli.py"


def run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    cmd = [sys.executable, str(CLI_SCRIPT), *args]
    return subprocess.run(
        cmd,
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )


def test_cli_scan_help_displays_pr_flag() -> None:
    proc = run_cli("scan", "--help")
    assert proc.returncode == 0
    assert "--pr" in proc.stdout
    normalized_stdout = " ".join(proc.stdout.split())
    assert "Simulate pull request changes against architectural graph and output risk bands and SPOF ranks" in normalized_stdout


def test_cli_scan_pr_blocks_critical_cascades() -> None:
    """Verifies default scan --pr blocks when critical risks or SPOFs exceed threshold."""
    proc = run_cli("scan", "--pr")
    assert proc.returncode == 1, f"Expected returncode 1, got {proc.returncode}. Output:\n{proc.stdout}\n{proc.stderr}"
    out = proc.stdout

    # Verify Header
    assert "REPRIEVE PRE-MERGE GATE" in out
    assert "PULL REQUEST ARCHITECTURAL RISK REPORT" in out

    # Verify Risk Bands
    assert "CRITICAL" in out
    assert "MODERATE" in out
    assert "LOW" in out

    # Verify SPOF Ranks
    assert "Rank #1" in out
    assert "Rank #2" in out
    assert "Single Point of Failure (SPOF)" in out

    # Verify Cascading Multi-Hop Failure Paths
    assert "Cascading Multi-Hop Failure Paths" in out
    assert "svc_payments_gateway" in out
    assert "svc_checkout_api" in out

    # Verify Temporal Collisions
    assert "Temporal Collision Warnings" in out
    assert "col_cluster_01" in out

    # Verify Blocked Verdict
    assert "PRE-MERGE GATE: BLOCKED" in out
    assert "Circuit Breaker Triggered" in out


def test_cli_scan_pr_approves_safe_threshold() -> None:
    """Verifies scan --pr approves when targeting low risk service with appropriate threshold."""
    proc = run_cli("scan", "--pr", "--fail-threshold", "100.0", "--service", "svc_auth_cache")
    assert proc.returncode == 0, f"Expected returncode 0, got {proc.returncode}. Output:\n{proc.stdout}"
    out = proc.stdout

    assert "REPRIEVE PRE-MERGE GATE" in out
    assert "svc_auth_cache" in out
    assert "LOW" in out
    assert "PRE-MERGE GATE: APPROVED" in out
    assert "Architecture safe within +30d horizon" in out


def test_cli_scan_without_pr_runs_standard_scanner() -> None:
    """Verifies scan without --pr maintains backward compatibility with standard bypass scanner."""
    proc = run_cli("scan", "--dir", "backend/app/detection")
    assert proc.returncode == 0
    out = proc.stdout
    assert "Reprieve Autonomous Scanner" in out
    # Should not have PR gate header when --pr is omitted
    assert "REPRIEVE PRE-MERGE GATE · PULL REQUEST ARCHITECTURAL RISK REPORT" not in out


def test_cli_check_help_and_command() -> None:
    """Verifies check command is registered and functional."""
    proc = run_cli("check", "--help")
    assert proc.returncode == 0
    assert "--service" in proc.stdout
    assert "--horizon" in proc.stdout
    assert "--fail-threshold" in proc.stdout


def test_cli_scan_pr_with_mock_live_api() -> None:
    """Verifies scan --pr against a live simulation endpoint responding with SimulationForecastOut schema."""
    forecast_payload = {
        "as_of": 1792195200,
        "horizon_days": 30,
        "projected_date": 1794787200,
        "execution_time_ms": 14.2,
        "avalanche_centrality": [
            {
                "service_id": "svc_test_core",
                "service_name": "Test Core",
                "score": 92.4,
                "band": "critical",
                "spof_rank": 1,
                "cascade_probability": 0.89,
                "reachable_services": ["svc_test_worker"],
                "customer_paths": ["cp_test"],
                "proof": {
                    "nodes": ["svc_test_core", "svc_test_worker"],
                    "edges": [{"from": "svc_test_core", "to": "svc_test_worker", "type": "DEPENDS_ON"}],
                },
            }
        ],
        "temporal_collisions": [
            {
                "cluster_id": "col_live_99",
                "window_start": 1792195200,
                "window_end": 1792800000,
                "exception_ids": ["exc_live_01"],
                "affected_services": ["svc_test_core"],
                "severity_score": 9.2,
                "collision_severity": 9.2,
                "severity_band": "critical",
                "proof": {"nodes": ["svc_test_core"], "edges": []},
            }
        ],
        "canvas_decorations": {},
    }

    class MockHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            body = json.dumps(forecast_payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            # Suppress console logging during test
            pass

    server = HTTPServer(("127.0.0.1", 0), MockHandler)
    port = server.server_port
    server_thread = threading.Thread(target=server.handle_request, daemon=True)
    server_thread.start()

    try:
        proc = run_cli(
            "scan",
            "--pr",
            "--api-url",
            f"http://127.0.0.1:{port}",
            "--workspace",
            "ws_live_mock",
        )
        assert proc.returncode == 1
        out = proc.stdout
        assert "svc_test_core" in out
        assert "CRITICAL" in out
        assert "Rank #1" in out
        assert "col_live_99" in out
        assert "PRE-MERGE GATE: BLOCKED" in out
    finally:
        server.server_close()
