# Dispatch: Test Writer (E2E Testing Track)

- **Role**: Requirement-Driven Test Writer
- **Working Directory**: d:\hackthon\Nvidea\.agents\teamwork\test_writer_e2e
- **Target Workspace**: d:\hackthon\Nvidea
- **Authoritative Request**: d:\hackthon\Nvidea\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope Document**: d:\hackthon\Nvidea\PROJECT.md
- **Exclusive File Ownership**:
  - `eval/e2e/` (test scripts, test runner, fixtures)
  - `TEST_INFRA.md`
  - `TEST_READY.md`

## 2026-10-15T23:09:52Z
[Message] timestamp=2026-10-15T23:09:52Z sender=9b0fddfb-514e-419c-b57c-ebbf64019604 priority=MESSAGE_PRIORITY_HIGH content=You are the E2E Test Writer for Project Reprieve.

Your working directory is:
d:\hackthon\Nvidea\.agents\teamwork\test_writer_e2e

Target workspace:
d:\hackthon\Nvidea

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All test cases and runners must be genuine. DO NOT mock out entire systems or create tautological tests that pass without actually exercising the targets. An auditor will independently verify your work.

MANDATORY INPUT:
Read the authoritative user request at:
d:\hackthon\Nvidea\.agents\teamwork\ORIGINAL_REQUEST.md
Also inspect:
d:\hackthon\Nvidea\PROJECT.md
d:\hackthon\Nvidea\README.md
d:\hackthon\Nvidea\docs/

EXCLUSIVE FILE OWNERSHIP:
- eval/e2e/ (test scripts, test runner, test cases)
- TEST_INFRA.md
- TEST_READY.md

TASKS:
1. Design and implement a comprehensive opaque-box E2E test suite in `eval/e2e/` verifying all user requirements (R1–R5) and acceptance criteria:
   - **Tier 1 - Feature Coverage**:
     - FalkorDB tri-planar graph connectivity & invariants (R1)
     - Avalanche Centrality AC(u) computation & bounds (R2)
     - Temporal collision clustering (R2)
     - Nebius Token Factory & NVIDIA Nemotron routing configuration (R3)
     - Provenance guardrail `guard.py` zero-hallucination pruning (R3)
     - Tavily threat intel tool `tavily_search_threat_intel` execution & warning fallback (R4)
     - Pre-merge CI CLI gate execution (R5)
     - Frontend canvas pulsating risk halo & Steward SSE chat contracts (R5)
   - **Tier 2 - Boundary & Corner Cases**:
     - Disconnected graph (0 edges) -> AC(u) = 0.0, low risk band
     - Cyclic dependency loops -> terminates without infinite loop
     - Missing API keys (Tavily, Nebius) -> graceful warning payloads without unhandled crash
     - Empty PR scan / empty workspace -> handles gracefully
     - Guardrail: sentence with multiple uncited IDs vs all cited IDs
   - **Tier 3 - Cross-Feature Combinations**:
     - Exception waiver -> invariant detection -> avalanche centrality recalculation -> CLI gate detection
     - Ingestion extraction -> entity resolution -> proof path generation
   - **Tier 4 - Real-World Application Scenarios**:
     - Seed Northwind dataset simulation -> SPOF ranking on payments_gateway / checkout_api -> cascade probability to ingress
2. Create `eval/e2e/run_all.py` (or pytest-compatible runner) that executes the complete test suite and outputs clean pass/fail statistics with exit code 0 on all pass.
3. Document the architecture in `TEST_INFRA.md` at project root.
4. When all test cases are written, validated, and passing, generate `TEST_READY.md` at project root summarizing the coverage and test runner command.
5. Deliverables:
   - Write your handoff report to `d:\hackthon\Nvidea\.agents\teamwork\test_writer_e2e\handoff.md`.
   - Send a brief completion message to the parent agent.
