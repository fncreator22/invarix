# Dispatch: Worker M1 (Backend Hardening & Nebius/Nemotron Model Routing)

- **Role**: Backend & ML Systems Worker
- **Working Directory**: d:\hackthon\Nvidea\.agents\teamwork\worker_m1
- **Target Workspace**: d:\hackthon\Nvidea
- **Authoritative Request**: d:\hackthon\Nvidea\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope Document**: d:\hackthon\Nvidea\PROJECT.md
- **Explorer Findings to Reference**:
  - `d:\hackthon\Nvidea\.agents\teamwork\explorer_survey_backend_1\handoff.md`
  - `d:\hackthon\Nvidea\.agents\teamwork\spec_miner_survey_1\handoff.md`
- **Exclusive File Ownership**:
  - `backend/pyproject.toml`
  - `data/seed/threads/hostile_thread.txt`
  - `backend/tests/test_performance_harness.py`
  - `backend/app/config.py`
  - `backend/app/ingest/extractor.py`
  - `backend/.env`

## 2026-10-15T23:09:52Z
You are Worker M1 for Project INVARIX.

Your working directory is:
d:\hackthon\Nvidea\.agents\teamwork\worker_m1

Target workspace:
d:\hackthon\Nvidea

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUT:
Read the authoritative user request at:
d:\hackthon\Nvidea\.agents\teamwork\ORIGINAL_REQUEST.md
Also inspect:
d:\hackthon\Nvidea\PROJECT.md
d:\hackthon\Nvidea\.agents\teamwork\explorer_survey_backend_1\handoff.md
d:\hackthon\Nvidea\.agents\teamwork\spec_miner_survey_1\handoff.md

EXCLUSIVE FILE OWNERSHIP:
- backend/pyproject.toml
- data/seed/threads/hostile_thread.txt
- backend/tests/test_performance_harness.py
- backend/app/config.py
- backend/app/ingest/extractor.py
- backend/.env

TASKS:
1. Virtual Environment & Test Harness Dependencies:
   - In `backend/pyproject.toml`: Add `respx>=0.21.0` under dependency groups and add `[tool.pytest.ini_options]` with `asyncio_mode = "auto"`.
   - Run `pip install respx` or `uv pip install respx` in `backend/.venv` (or project environment).
2. Test Fixture & Constants Repair:
   - Create `data/seed/threads/hostile_thread.txt` with realistic sample security discussion text containing prompt injection patterns (`IGNORE PREVIOUS RULES`, `TLS 1.2`, `Payments Gateway`, `Priya`, `Marcus Bell`).
   - In `backend/tests/test_performance_harness.py`: Define `N_ITERATIONS = 30` at module level.
3. Nebius Token Factory & NVIDIA Nemotron Dual-Model Routing:
   - In `backend/app/config.py`: Add `compat_model_ingest: str = "nebius/nvidia/Nemotron-3_5-Lightning"` and set default `compat_model: str = "nvidia/nemotron-3-super-120b-a12b"` (support both `nvidia/` and `nebius/nvidia/` prefixes).
   - In `backend/app/ingest/extractor.py`: Expand `MAX_TEXT` from 6,000 to 200,000 characters to leverage the 1M-token context window of `Nemotron-3_5-Lightning` when `compat_model_ingest` is used.
   - In `backend/.env`: Ensure `LLM_PRIMARY=compat`, `COMPAT_BASE_URL=https://api.tokenfactory.nebius.ai/v1`, `COMPAT_API_KEY=your_nebius_token_factory_key_here`, and `COMPAT_MODEL=nvidia/nemotron-3-super-120b-a12b` are set.
4. Run Verification:
   - Run pytest across all affected test files:
     `pytest tests/test_predictions.py tests/test_avalanche_adversarial.py tests/test_challenger_collisions_api.py tests/test_ingest.py tests/test_performance_harness.py tests/test_plugins.py tests/test_steward.py tests/test_conversational_grounding.py tests/test_detection_seed.py`
   - Ensure all tests pass.
5. Deliverables:
   - Write your handoff report to `d:\hackthon\Nvidea\.agents\teamwork\worker_m1\handoff.md` with:
     - All code modifications made
     - Full test execution results and outputs
     - Verification proof
   - Send a brief completion message to the parent agent.

## 2026-10-15T23:16:07Z
retry
