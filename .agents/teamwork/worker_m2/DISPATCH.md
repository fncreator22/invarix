## 2026-10-15T23:44:20Z
You are Worker M2 for Project INVARIX.

Your working directory is:
d:\hackthon\Nvidea\.agents\teamwork\worker_m2

Target workspace:
d:\hackthon\Nvidea

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUT:
Read the authoritative user request at:
d:\hackthon\Nvidea\.agents\teamwork\ORIGINAL_REQUEST.md
Also inspect:
d:\hackthon\Nvidea\PROJECT.md
d:\hackthon\Nvidea\.agents\teamwork\spec_miner_survey_1\handoff.md
d:\hackthon\Nvidea\.agents\teamwork\explorer_survey_frontend_1\handoff.md
d:\hackthon\Nvidea\scripts/cli.py

EXCLUSIVE FILE OWNERSHIP:
- scripts/cli.py
- backend/tests/test_cli_gate.py

TASKS:
1. Implement `scan --pr` in `scripts/cli.py`:
   - In `scan_p`: Add argument `--pr` (`action="store_true"`, help="Simulate pull request changes against architectural graph and output risk bands and SPOF ranks").
   - In `cmd_scan`: When `args.pr` is True:
     - Run the file scan for bypasses (`# nosec`, `@skip`, `TODO(waiver)`).
     - Query the simulation endpoint `GET /api/v1/workspaces/{ws_id}/prediction/simulation?horizon_days=30` using the configured API URL and API key (or default `http://localhost:8000` / `rep_live_local` or mock fallback if offline).
     - Extract `avalanche_centrality` and `temporal_collisions`.
     - Output the formatted Pre-Merge Gate report displaying:
       - Header / Pull Request Gate status
       - Target Services with Risk Scores and Risk Bands (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`)
       - SPOF Ranks (e.g., `Rank #1`, `Rank #2`)
       - Cascading Multi-Hop Failure Paths and Temporal Collision warnings
       - Blocked / Approved verdict with exit code 1 if critical/SPOF risk threshold is exceeded, or 0 if approved.
2. Verification:
   - Create or update `backend/tests/test_cli_gate.py` to test `scripts/cli.py scan --pr` and `scripts/cli.py check`.
   - Run `python scripts/cli.py scan --pr` directly and verify it outputs risk bands, SPOF ranks, and executes without unrecognized argument error.
   - Run all E2E and unit tests to ensure no regressions.
3. Deliverables:
   - Write your handoff report to `d:\hackthon\Nvidea\.agents\teamwork\worker_m2\handoff.md` with:
     - Code changes made to `scripts/cli.py`
     - Terminal verification output of `python scripts/cli.py scan --pr`
     - Test execution results
   - Send a completion message to the parent agent.
