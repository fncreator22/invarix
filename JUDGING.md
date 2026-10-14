# Reprieve — Hackathon Judging & Evaluation Hub

> **Event**: *Graph Hacks: Context for AI Agents* (WeMakeDevs & FalkorDB)  
> **Official Track Declarations**:
> - **Primary Track**: **Track 03 — Company Brain**
> - **Secondary Track**: **Track 02 — Agent Memory and Coordination**
> - **Tertiary Track**: **Track 01 — Agents That Act on Connected Data**  
> **Submission Repository**: [`https://github.com/fncreator22/wemakedevs-hackathon.git`](https://github.com/fncreator22/wemakedevs-hackathon.git)  
> **Rule Compliance**: Fully compliant with Rule R10 (Submission Requirements) and Rule R11 (AI Coding Assistant Disclosure).

---

## 1. Executive Summary: What is Reprieve?

**Individually reasonable exceptions add up to one unreasonable risk. Reprieve is the autonomous graph intelligence agent that sees the sum.**

Every engineering organization routinely issues temporary operational exceptions: security waivers, feature-flag overrides, skipped regression tests, budget expansions, manual data exports, and emergency hotfixes. Flat relational tables, issue trackers (Jira/Linear), and spreadsheets fail completely because they view each record in isolation. They cannot detect when:
- 5 independent low-severity waivers pile up on a single checkout microservice.
- 3 distinct exceptions all designate the same on-call engineer as their fallback person.
- 4 critical security controls expire simultaneously in the exact same calendar week across cascading dependencies.
- A departure or team re-org leaves an active production waiver orphaned with no accountable owner.

Reprieve models every exception as a **first-class promise in a living FalkorDB knowledge graph**—connecting Services, People, Teams, Controls, Exceptions, Compensating Controls, Evidence, and Customer-Facing Paths. It computes compound combinatorial risk and projects cascading failure dynamics before outages strike.

---

## 2. Track Alignment & Evidence Map

### Track 03: Company Brain (Primary Track)
*Unifying disparate enterprise data into a living graph to map combinatorial risk and trace decisions.*

| Criterion | Implementation & Source Coordinates | Evidence |
| :--- | :--- | :--- |
| **Living Entity Graph** | `backend/app/graph/schema.py` & `docs/architecture/02-data-model.md` | Models 8 interconnected entity types (`Service`, `Team`, `Person`, `Exception`, `Control`, `CompensatingControl`, `CustomerPath`, `Evidence`) connected across 12 relationship types. |
| **Invariant Detection Rules** | `backend/app/detection/engine.py` & `backend/app/detection/config.yaml` | 8 named, parameterized Cypher detection rules (R1 to R8) executing deterministically against the graph topology without LLM hallucinations. |
| **Shortest Proof Paths** | `backend/app/detection/proof.py` & `backend/app/graph/queries/radius_paths.cypher` | Every alert is backed by the deterministic shortest proof path connecting the exception, service, and affected customer journey. |
| **Compound Risk Scoring** | `backend/app/detection/scoring.py` | Reproducible 0–100 risk score derived from exponential decay, topology hops, control weights, and PageRank / Betweenness centrality. |

### Track 02: Agent Memory and Coordination (Secondary Track)
*Persistent agent state, episodic turns, semantic precedent recall, and on-call handoff tasks across FalkorDB graphs.*

| Criterion | Implementation & Source Coordinates | Evidence |
| :--- | :--- | :--- |
| **Tri-Planar Graph Architecture** | `backend/app/graph/client.py` & `backend/app/auth/deps.py` | Complete multi-tenant graph isolation: `platform` (workspaces/users), `org_<ws_id>` (domain risk graph), and `mem_<ws_id>` (agent memory graph). |
| **Episodic Turn Memory** | `backend/app/agents/steward.py` & `backend/app/graph/queries/mem_*.cypher` | Every conversational turn writes structured `Turn` nodes storing user intent, used tools, cited entities, and token usage. |
| **Semantic Precedent Recall** | `backend/app/memory/store.py` & `backend/app/api/memory.py` | Recalls historical review decisions on the exact same control/service to maintain consistency across human and AI deliberations. |
| **Procedural Playbooks & Handoffs** | `backend/app/memory/store.py` (`seed_playbooks`, `handoffs`) | Automatic creation of `HandoffTask` nodes upon critical alert resolution so subsequent shifts inherit context seamlessly. |

### Track 01: Agents That Act on Connected Data (Tertiary Track)
*Autonomous agents operating over live connected graph structures via MCP and grounded tool loops.*

| Criterion | Implementation & Source Coordinates | Evidence |
| :--- | :--- | :--- |
| **14 MCP Graph Reasoning Tools** | `backend/app/agents/tools.py` & `backend/app/api/mcp.py` | Exposes a full suite of 14 deterministic graph tools conforming to the open Model Context Protocol (MCP) specification. |
| **Groundedness Guard Invariant** | `backend/app/agents/guard.py` | Regex-powered provenance validator that automatically strips any entity ID from agent responses that was not present in tool results. |
| **Safe Proposed Actions** | `backend/app/agents/tools.py` (`propose_review`, `pop_action`) | Agent NEVER executes write operations directly. Mutations are emitted as cryptographically validated `ProposedAction` cards requiring human approval. |
| **Bounded Execution Guardrail** | `backend/app/agents/steward.py` | Enforces a strict maximum of 6 tool invocations per turn to prevent unbounded inference loops and cost runaway. |

---

## 3. Mathematical Foundations: Predictive Intelligence

Reprieve goes beyond static point-in-time querying by implementing formal graph algorithms in `backend/app/prediction/`:

### 1. Avalanche Centrality ($AC(u)$)
For any service $u$, Avalanche Centrality evaluates the probability that an outage at $u$ cascades through inverted dependency trees to topple customer-facing ingress points:
$$AC(u) = 1 - \prod_{p \in \text{Paths}(u \to \text{Ingress})} (1 - p_0^{\text{len}(p)})$$
Where $p_0 = 0.85$ is the base single-hop failure probability. Services with high $AC(u)$ and zero redundancy are automatically flagged as Single Points of Failure (**SPOF**).

### 2. Temporal Expiry Collision Dynamics
Computes sliding temporal windows (30, 60, 90 days) where multiple exceptions across connected dependencies expire simultaneously. When multiple dependencies lose their compensating controls within a tight window ($\Delta t \le 7\text{d}$), risk compounds super-linearly.

---

## 4. Benchmark Evaluation & Verification Suite

Reprieve includes a verifiable, automated evaluation benchmark in `eval/run_eval.py` tested against our golden seed dataset (`data/seed/northwind.json`):

```bash
# Execute evaluation harness
cd backend && python ../eval/run_eval.py
```

### Verified Benchmark Results (`eval/report.md`)
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

## 5. Friction-Free Local Setup & Zero-Login CLI

Reprieve can be evaluated immediately without creating external cloud accounts or OAuth apps:

```bash
# 1. Clone repository
git clone https://github.com/fncreator22/wemakedevs-hackathon.git
cd wemakedevs-hackathon

# 2. Start FalkorDB container
docker compose up -d falkordb

# 3. Setup backend and execute test suite
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS: source venv/bin/activate
pip install -e .
pytest -q

# 4. Run the benchmark evaluation
python ../eval/run_eval.py

# 5. Launch web UI (in frontend/)
cd ../frontend
pnpm install
pnpm dev
```

Visit `http://localhost:3000` — click **"Explore Northwind Pay Sample"** to instantly explore the pre-seeded graph canvas, view pulsing risk halos, and chat with Steward.

---

## 6. Official Rule Disclosures

### Rule R10: Submission Requirements
1. **Public Repository**: Publicly accessible at `https://github.com/fncreator22/wemakedevs-hackathon.git`.
2. **README**: Comprehensive setup instructions, architectural diagram, and FalkorDB data model in `README.md`.
3. **Named Cypher Queries**: 32 static, parameterized Cypher queries in `backend/app/graph/queries/`.
4. **Demo Media**: Video demonstrations embedded in `README.md` and located in `frontend/public/videos/`.
5. **Live Verification**: Automated test suite (`pytest`) and evaluation harness (`eval/run_eval.py`).

### Rule R11: AI Coding Assistant Disclosure
In accordance with official hackathon rule R11, AI coding assistants (including Antigravity, Claude, and Codex) were utilized during the architecture planning, query drafting, and progressive test harness implementation stages under strict human supervision, continuous test verification, and mathematical validation.
