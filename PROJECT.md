# Project: Reprieve — Autonomous Cascading Risk Engine

## Architecture
Reprieve turns fragmented software exceptions, security waivers, and technical debt overrides into a verifiable, tri-planar knowledge graph that detects cascading multi-service risk collisions before production deployment.

```
                    ┌───────────────────────────────┐
                    │  Next.js 16 / React 19 UI     │
                    │  - Force-Directed 2D Canvas   │
                    │  - Pulsing Halo Highlights    │
                    │  - Steward SSE Chat Stream    │
                    └───────────────┬───────────────┘
                                    │ HTTP / SSE / REST
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│ FastAPI Application (`backend/app/main.py`)                      │
│                                                                   │
│  ├─ Multi-Agent Swarm (`backend/app/agents/`)                    │
│  │   ├─ Steward (Conversational reasoning, max 6 tools/turn)     │
│  │   ├─ Sentinel (Background graph watcher & dirty-debouncer)    │
│  │   ├─ Provenance Guardrail (`guard.py`: zero-hallucinated IDs) │
│  │   └─ Provider Routing (Nebius Token Factory / NVIDIA Nemotron)│
│  │                                                                │
│  ├─ Deterministic Prediction Engine (`backend/app/prediction/`)   │
│  │   ├─ Avalanche Centrality: AC(u) = 1 - ∏(1 - p0^len(p))       │
│  │   ├─ SPOF Ranking & Tier Weighting (T1=3.0, T2=2.0, T3=1.0)   │
│  │   └─ Temporal Expiry Collision Dynamics (7d sliding window)    │
│  │                                                                │
│  ├─ Graph & Invariant Engine (`backend/app/detection/`)          │
│  │   ├─ 8 Deterministic Invariants (R1–R8)                        │
│  │   └─ Shortest Proof Paths (minimal hops, lexicographic tie)   │
│  │                                                                │
│  └─ Tool Registry (15 tools including `tavily_search_threat_intel`)
└───────────────────┬───────────────────────────┬───────────────────┘
                    │ Redis Protocol            │ MCP / CLI
                    ▼                           ▼
┌───────────────────────────────────────┐ ┌─────────────────────────┐
│ FalkorDB Tri-Planar Knowledge Graph   │ │ CLI Pre-Merge Gate      │
│  ├─ `platform`: Users, Workspaces     │ │ `scripts/cli.py`        │
│  ├─ `org_<ws>`: Domain graph          │ │ - `check`               │
│  └─ `mem_<ws>`: Episodic / Facts / Ref│ │ - `scan --pr`           │
└───────────────────────────────────────┘ └─────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Tri-Planar Knowledge Graph | Isolated Platform, Domain (`org_<ws>`), and Memory (`mem_<ws>`) graphs on FalkorDB | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Invariants R1–R8 Detection | 8 deterministic invariants with shortest proof paths | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Avalanche Centrality Engine | AC(u) = 1 - ∏(1 - p0^len(p)), SPOF ranking, tier weighting, customer paths | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Temporal Collision Dynamics | Sliding 7-day horizon collision window clustering across ≤2 hops | M1 | ORIGINAL_REQUEST §R2 |
| 5 | Nebius Dual-Model Routing | Wire 1M-context `Nemotron-3_5-Lightning` for ingestion and `nemotron-3-super-120b` for reasoning | M1 | ORIGINAL_REQUEST §R3 |
| 6 | Provenance Guardrail | Zero hallucinated entity IDs in output citations (`guard.py`) | M1 | ORIGINAL_REQUEST §R3 |
| 7 | Tavily Threat Intel Tool | `tavily_search_threat_intel` registered in tools.py with error handling | M1 | ORIGINAL_REQUEST §R4 |
| 8 | CLI Pre-Merge Gate `scan --pr` | `scripts/cli.py scan --pr` executes simulation and outputs risk bands & SPOF ranks | M2 | ORIGINAL_REQUEST §R5, AC5 |
| 9 | Force-Directed Risk Canvas | WebGL/2D canvas with pulsating risk halos (`sin(Date.now()/250)`) & proof paths | M3 | ORIGINAL_REQUEST §R5, AC6 |
| 10 | Steward SSE Chat UI | Interactive chat streaming SSE turns with thinking orbs and action approvals | M3 | ORIGINAL_REQUEST §R5 |
| 11 | Frontend Lint & Build Quality | Clean zero-error `pnpm lint`, `pnpm typecheck`, `pnpm build` | M3 | Acceptance Criteria |
| 12 | E2E Requirement-Driven Tests | Multi-tier test suite (Tiers 1–4) verifying all user acceptance criteria | M-E2E | Acceptance Criteria |
| 13 | Final Verification & Forensic Audit | 100% E2E test pass, adversarial hardening (Tier 5), forensic integrity verification | M-Final | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Hardening & Nebius Model Routing | Add `respx`, configure `asyncio_mode="auto"`, add `hostile_thread.txt`, fix `N_ITERATIONS`, wire dual Nebius/Nemotron models & expand ingestion context | none | DONE |
| M2 | Pre-Merge CI CLI Gate (`scan --pr`) | Implement `--pr` in `scripts/cli.py` to simulate PR changes against graph, query `/prediction/simulation`, output risk bands & SPOF ranks | M1 | DONE |
| M3 | Frontend Linting & Visual Validation | Fix 12 ESLint errors in `frontend/`, verify 2D force-directed canvas pulsating halos and SSE chat streaming | none | DONE |
| M-E2E | E2E Testing Suite Track | Design and build comprehensive opaque-box test runner across Tiers 1–4 and publish `TEST_READY.md` | none | DONE |
| M-Final | E2E Pass, Hardening & Forensic Audit | Pass 100% of E2E tests (Tiers 1–4), adversarial coverage hardening (Tier 5), and Forensic Integrity Audit | M1, M2, M3, M-E2E | DONE |

## Interface Contracts
### CLI ↔ Backend Prediction API
- Endpoint: `GET /api/v1/workspaces/{ws_id}/prediction/simulation?horizon_days={horizon}`
- Request Headers: `Authorization: Bearer <api_key>` or machine key `rep_live_local`
- Response Schema: `SimulationForecastOut`
  - `avalanche_centrality`: list of `AvalancheCentralityItem` (`service_id`, `score`, `risk_band`, `spof_rank`, `is_spof`, `cascade_probability`)
  - `temporal_collisions`: list of `TemporalCollisionItem` (`cluster_id`, `score`, `affected_services`, `exception_ids`)
- CLI Exit Codes:
  - `0`: Merge allowed (no critical collisions, no high-risk SPOF violations)
  - `1`: Merge blocked (critical risk score ≥ 75 or critical SPOF detected)
  - `2`: API connection error

### Frontend ↔ Backend Chat SSE
- Endpoint: `POST /api/v1/workspaces/{ws_id}/chat/sessions/{session_id}/messages`
- Event Types: `token` (`{"delta": str}`), `tool.call` (`{"tool": str, "args": dict}`), `tool.result` (`{"summary": str}`), `final` (`{"answer": str}`), `error` (`{"error": str}`)
- Grounding: Backend applies `guard.ground()` prior to emitting `final` event.

### Dual-Model Nebius Token Factory Configuration
- `COMPAT_BASE_URL`: OpenAI-compatible endpoint URL (e.g. `https://api.tokenfactory.nebius.ai/v1`)
- `COMPAT_API_KEY`: Nebius API key
- `COMPAT_MODEL_INGEST`: `nebius/nvidia/Nemotron-3_5-Lightning` (1M context window for monorepo and manifest ingestion)
- `COMPAT_MODEL`: `nebius/nvidia/nemotron-3-super-120b-a12b` (Conversational multi-hop causal reasoning)

## Code Layout
- Backend Source: `backend/app/`
  - Invariants & Graph: `backend/app/graph/`, `backend/app/detection/`
  - Prediction: `backend/app/prediction/`
  - Agents & Tools: `backend/app/agents/`
  - API Routes: `backend/app/api/`
- Backend Tests: `backend/tests/`
- Frontend Source: `frontend/`
  - Components: `frontend/components/` (graph, steward, etc.)
  - App Routes: `frontend/app/`
- Scripts & CLI: `scripts/cli.py`, `scripts/seed.py`, `scripts/smoke.py`
- Test Fixtures: `data/seed/`
- E2E Test Suite: `eval/e2e/`
