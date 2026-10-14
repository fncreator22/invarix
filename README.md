# Reprieve — Graph-Native Risk Reasoning Engine

> **Individually reasonable exceptions add up to one unreasonable risk. Reprieve is the agent that sees the sum.**

Built for **Graph Hacks: Context for AI Agents** (WeMakeDevs × FalkorDB).  
*Detailed Judging Criteria & Audit Map*: [`JUDGING.md`](JUDGING.md) · *Agent Invariants & MCP Guide*: [`AGENTS.md`](AGENTS.md)

---

## 🎯 Official Hackathon Track Submissions

* **Track 03: Company Brain (Primary)**: Unifies services, people, teams, controls, and operational waivers into a living graph to map combinatorial architectural risk, answer executive questions, and trace liability back to its origin.
* **Track 02: Agent Memory and Coordination (Secondary)**: Implements isolated episodic (`Turn`), semantic (`Fact`/`Playbook`), and on-call handoff memory per tenant inside FalkorDB (`mem_<ws_id>`), allowing agents to recall prior approval rationales and coordinate on-call handoffs.
* **Track 01: Agents That Act on Connected Data (Tertiary)**: Exposes 14 deterministic read-only graph reasoning tools over the Model Context Protocol (MCP) to compute avalanche centrality, shortest proof paths, and blast radius simulations.

---

## 🔍 The Problem: Flat Registers Hide Compound Risk

Engineering organizations grant temporary exceptions all the time: security waivers, feature-flag overrides, skipped regression tests, cost-limit extensions, manual data exports, and emergency changes. Flat relational tables and issue trackers view each record in isolation. They cannot detect when:
* 5 independent low-severity waivers pile up on a single checkout microservice.
* 3 distinct exceptions all designate the same on-call engineer as their fallback person.
* 4 critical security controls expire simultaneously in the exact same calendar week across cascading dependencies.
* A team departure leaves an active production waiver orphaned with no accountable owner.

Reprieve models every exception as a **first-class promise in a living FalkorDB knowledge graph**—connecting Services, People, Teams, Controls, Exceptions, Compensating Controls, Evidence, and Customer-Facing Paths.

---

## 🏗️ Tri-Planar Architecture (Track 02)

Reprieve leverages FalkorDB's multi-graph capability to maintain three strictly isolated graphs per workspace:

| Graph | Name Format | Purpose |
| :--- | :--- | :--- |
| **Platform Graph** | `platform_<prefix>` | Workspace identity, user accounts, memberships, and machine API keys. |
| **Domain Graph** | `org_<ws_id>` | Living topology: Services, Waivers, Teams, People, Controls, and Customer Paths. |
| **Memory Graph** | `mem_<ws_id>` | Agent episodic conversations (`Turn`), semantic precedent (`Fact`), and runbooks (`Playbook`). |

```
Browser ──► Next.js 16 (App Router + Force-Directed Canvas)
   │
   └──REST + SSE (Bearer Token)──► FastAPI Backend ──► FalkorDB (:6379)
                                       │                 ├── platform_<prefix>
                                       │                 ├── org_<ws_id>
                                       │                 └── mem_<ws_id>
                                       └──► OpenAI-Compatible LLM (Ollama / Cloud)
```

---

## 🛡️ Agent Reasoning Invariants & 14 MCP Tools (Track 01)

Reprieve is governed by four strict architectural guarantees:

1. **The LLM Never Writes Cypher**: Every graph traversal is executed from named, parameterized Cypher files in `backend/app/graph/queries/`. This eliminates Cypher injection, hallucinated graph schemas, and runaway queries.
2. **Tools Are Read-Only**: Agent tools only read the graph. Any write or remediation is emitted as a structured `ProposedAction` requiring human sign-off.
3. **100% Grounded Output**: Every generated response passes through `backend/app/agents/guard.py`, which strips any entity ID not returned in graph tool results.
4. **Deterministic Tool Budget**: The agent conversation loop caps tool executions at **6 calls per turn** to control latency and prevent reasoning drift.

### Available MCP Tools (14)

| Tool Name | Scope & Purpose |
| :--- | :--- |
| `list_alerts` | Active alerts in the workspace, ordered by severity |
| `get_alert` | Full alert detail including shortest proof path |
| `list_exceptions` | Active exceptions in the workspace with filters |
| `get_exception` | Full exception detail with control, owner, services, and renewal chain |
| `list_expiring` | Exceptions expiring within N days |
| `list_orphaned` | Exceptions whose owner has left or is inactive |
| `list_services` | Services with their deterministic risk score and exception count |
| `get_service` | Full service detail including dependency graph context |
| `proof_path` | Shortest proof path between two graph nodes |
| `predict_avalanche` | Avalanche centrality ($P = p_0^h$) for a service over N days |
| `predict_expiry_collisions` | Temporal collision windows across sliding calendar horizons |
| `what_if_as_of` | Full detection run at a future date (read-only preview, does not persist) |
| `propose_review` | Returns a `ProposedAction` to schedule a review (human must approve) |
| `recall_precedent` | Searches the memory graph for prior decisions on the same control/service |

---

## 📊 Benchmark Evaluation & Zero-Hallucination Results

Reprieve includes an automated evaluation harness in `eval/run_eval.py` tested against our golden seed dataset (`data/seed/northwind.json`):

```bash
cd backend && python ../eval/run_eval.py
```

### Verified Benchmark Scorecard (`eval/report.md`)

| Evaluation Metric | Measured Benchmark | Target Threshold | Status |
| :--- | :--- | :--- | :--- |
| **Recall on Planted Outage Scenarios** | **5 / 5 (100%)** | 5 / 5 | ✅ PASS |
| **False Positives on Control Services** | **0 (Zero FP)** | 0 | ✅ PASS |
| **Critical / Control Services in Expected Band** | **2/2 · 3/3 (100%)** | 100% | ✅ PASS |
| **Owner Resolution Chain Accuracy** | **2 / 2 (100%)** | 100% | ✅ PASS |
| **p95 Rule Query Execution Latency** | **~2.1 ms** | < 200 ms | ✅ PASS |
| **Full Detection Engine Run Time** | **~22.4 ms** | < 3,000 ms | ✅ PASS |
| **Predictive Simulation Latency (30d Horizon)** | **~18.2 ms** | < 100 ms | ✅ PASS |

---

## ⚡ Quickstart (Friction-Free Local Setup)

### Prerequisites
* Docker & Docker Compose
* Python 3.11+
* Node.js LTS & pnpm

### 1. Launch FalkorDB
```bash
docker compose up -d falkordb
# FalkorDB is running on localhost:6379
# FalkorDB Browser is available on http://localhost:3001
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Run Backend Engine
```bash
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Linux/macOS: source .venv/bin/activate
pip install -e .
pytest -q
uvicorn app.main:app --reload --port 8000
```
API health endpoint is available at `http://localhost:8000/health`.

### 4. Run Frontend Web Client
```bash
cd ../frontend
cp .env.example .env.local
pnpm install
pnpm dev
```
Visit `http://localhost:3000` — click **"Explore Northwind Pay Sample"** to explore the interactive force-directed canvas with glowing risk halos, run what-if simulations, and converse with Steward.

---

## 🎥 Video Showreel & Interactive Demos

High-resolution cinematic showcase videos demonstrating the live product and predictive simulations are available in the repository:
* `frontend/public/videos/reprieve-graph-intelligence-30s.mp4` — 30-second kinetic product showreel.
* `frontend/public/videos/reprieve-hero-showcase.mp4` — Interactive UI walkthrough.

---

## 🤖 AI Assistant Disclosure (Hackathon Rule R11)

In compliance with Hackathon Rule R11, AI coding assistants (including Antigravity, Claude, and Codex) were utilized as pair programmers for boilerplate scaffolding, test generation, and documentation formatting. All architectural decisions, Cypher graph schemas, invariant detection logic, and verification suites were verified and directed by the project author.

---

## 📜 License

MIT License (see [`LICENSE`](LICENSE)).
