#!/usr/bin/env python3
"""INVARIX End-to-End (E2E) Test Suite Runner.

Executes all 4 test tiers:
- Tier 1: Feature Coverage (R1–R5)
- Tier 2: Boundary & Corner Cases
- Tier 3: Cross-Feature Combinations
- Tier 4: Real-World Application Scenarios (Northwind)

Outputs clean pass/fail statistics and returns exit code 0 on all pass.
Can be executed directly via:
    python eval/e2e/run_all.py
"""

import os
import sys
import time
from pathlib import Path

# ANSI color codes
RESET = "\033[0m"
BOLD = "\033[1m"
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
DIM = "\033[2m"

ROOT = Path(__file__).resolve().parents[2]
E2E_DIR = ROOT / "eval" / "e2e"
BACKEND_DIR = ROOT / "backend"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("GRAPH_PREFIX", "test_e2e_")
os.environ["DEV_AUTH"] = "false"

import pytest


TIER_SPECS = [
    {
        "tier": "Tier 1",
        "name": "Feature Coverage (R1–R5)",
        "file": E2E_DIR / "test_tier1_features.py",
        "items": [
            "FalkorDB tri-planar graph connectivity & schema isolation (R1)",
            "8 Deterministic Invariants (R1–R8) detection & shortest proof paths (R1)",
            "Avalanche Centrality AC(u) computation, mathematics & bounds (R2)",
            "Temporal collision clustering across sliding 7-day windows (R2)",
            "Nebius Token Factory & NVIDIA Nemotron routing configuration (R3)",
            "Provenance guardrail guard.py zero-hallucination pruning (R3)",
            "Tavily threat intel tool execution & warning fallback (R4)",
            "Pre-merge CI CLI gate execution & exit code semantics (R5)",
            "Frontend canvas pulsating risk halo contract (R5)",
            "Steward SSE chat streaming event contracts (R5)",
        ],
    },
    {
        "tier": "Tier 2",
        "name": "Boundary & Corner Cases",
        "file": E2E_DIR / "test_tier2_boundaries.py",
        "items": [
            "Disconnected graph (0 edges) -> AC(u) = 0.0, low risk band",
            "Cyclic dependency loops -> terminates without infinite recursion",
            "Missing API keys (Tavily, Nebius) -> graceful warning payloads",
            "Empty PR scan & empty workspace -> handles gracefully",
            "Guardrail adversarial pruning -> multiple uncited vs all cited IDs",
        ],
    },
    {
        "tier": "Tier 3",
        "name": "Cross-Feature Combinations",
        "file": E2E_DIR / "test_tier3_cross_features.py",
        "items": [
            "Exception waiver -> Invariant violation -> Cascade recalculation -> CLI pre-merge gate block",
            "Ingestion extraction -> Entity resolution -> Shortest proof path generation",
        ],
    },
    {
        "tier": "Tier 4",
        "name": "Real-World Application Scenarios",
        "file": E2E_DIR / "test_tier4_scenarios.py",
        "items": [
            "Northwind Pay dataset simulation -> payments_gateway & checkout_api SPOF ranking",
            "100% recall on planted ground truth scenarios (S1–S5) & 0 false positives on controls",
            "Deterministic owner-resolution accuracy on ground truth targets",
            "Sliding-horizon temporal collision clusters detection on connected graph",
        ],
    },
]


def print_banner():
    print(f"\n{BOLD}{CYAN}{'=' * 80}{RESET}")
    print(f"{BOLD}{CYAN}INVARIX Autonomous Cascading Risk Engine — E2E Test Suite{RESET}")
    print(f"{DIM}Verifying FalkorDB Tri-Planar Graph, Avalanche Centrality, Nebius & Pre-Merge Gate{RESET}")
    print(f"{BOLD}{CYAN}{'=' * 80}{RESET}\n")


def run_tier(tier_info: dict) -> tuple[int, float]:
    print(f"{BOLD}▶ Running {tier_info['tier']}: {tier_info['name']}{RESET}")
    for item in tier_info["items"]:
        print(f"  {DIM}• {item}{RESET}")

    t0 = time.perf_counter()
    ret = pytest.main([
        str(tier_info["file"]),
        "-v",
        "-o", "asyncio_mode=auto",
        "--tb=short",
    ])
    elapsed = time.perf_counter() - t0
    status_str = f"{GREEN}PASSED{RESET}" if ret == 0 else f"{RED}FAILED{RESET}"
    print(f"  Result: {status_str} in {elapsed:.2f}s\n")
    return ret, elapsed


def main() -> int:
    print_banner()
    t_start = time.perf_counter()
    results = []

    for tier in TIER_SPECS:
        code, dur = run_tier(tier)
        results.append((tier, code, dur))

    total_time = time.perf_counter() - t_start
    all_passed = all(code == 0 for _, code, _ in results)

    print(f"{BOLD}{CYAN}{'=' * 80}{RESET}")
    print(f"{BOLD}E2E TEST SUITE EXECUTION SUMMARY{RESET}")
    print(f"{BOLD}{CYAN}{'=' * 80}{RESET}")

    for tier, code, dur in results:
        status_tag = f"{GREEN}PASS{RESET}" if code == 0 else f"{RED}FAIL{RESET}"
        print(f"  [{status_tag}] {tier['tier']} ({tier['name']}): {dur:.2f}s ({len(tier['items'])} tests)")

    print(f"\n  {DIM}Total Duration:{RESET} {total_time:.2f}s")
    if all_passed:
        total_tests = sum(len(t["items"]) for t in TIER_SPECS)
        print(f"  {BOLD}{GREEN}ALL {total_tests} E2E TESTS PASSED CLEANLY (100% Success Rate){RESET}")
        print(f"{BOLD}{CYAN}{'=' * 80}{RESET}\n")
        return 0
    else:
        print(f"  {BOLD}{RED}E2E SUITE FAILED: One or more test tiers produced errors{RESET}")
        print(f"{BOLD}{CYAN}{'=' * 80}{RESET}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
