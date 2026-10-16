# INVARIX — Graph-Native Architectural Risk Engine & Pre-Merge Circuit Breaker

> **Individually reasonable exceptions add up to one unreasonable risk. INVARIX is the autonomous agentic engine that sees the sum.**

Built for the **Nebius × NVIDIA Global AI Hackathon (Coding & Agentic Engineering Track)**  
*Live Repository*: [`https://github.com/fncreator22/invarix.git`](https://github.com/fncreator22/invarix.git) · *Judging & Architecture Hub*: [`JUDGING.md`](JUDGING.md) · *Agent & MCP Guide*: [`AGENTS.md`](AGENTS.md)

---

## 🎯 Hackathon Track Submission

* **Primary Track**: **Coding and Agentic Engineering Track**
* **Core Mission**: Autonomous architectural risk analysis, causal graph reasoning, and pre-merge CI/CD circuit breaking that prevents catastrophic cascading outages before code reaches production.
* **Sponsor Integrations**:
  * **Nebius Token Factory**: Ultra-low-latency inference engine powering multi-agent orchestration.
  * **NVIDIA Nemotron Models**: 
    * `nebius/nvidia/Nemotron-3_5-Lightning` (1M Context): Ingests monorepos, Kubernetes manifests, Helm charts, and dependency topologies in a single prompt.
    * `nvidia/nemotron-3-super-120b-a12b`: Deep causal reasoning and natural-language shortest proof path synthesis.
  * **Tavily AI Search**: Real-time live threat intelligence loop querying in-the-wild zero-days and EOL advisories for waived dependencies (Devpost $3,000 Bounty Target).
  * **FalkorDB**: In-memory Redis OpenCypher tri-planar graph substrate providing sub-5ms path reachability.

---

## 🔍 The Problem: Flat Registers Hide Compound Risk

Engineering organizations grant temporary exceptions constantly: security waivers, feature-flag overrides, skipped regression tests, deprecated cipher fallbacks, and emergency hotfixes. 

Flat relational tables, Jira tickets, and spreadsheets view each exception in isolation. They cannot detect when:
* 5 independent low-severity waivers pile up on a single checkout microservice.
* 3 distinct exceptions all designate the same on-call engineer as their fallback person.
* 4 critical security controls expire simultaneously in the exact same calendar week across cascading dependencies.
* A team departure leaves an active production waiver orphaned with no accountable owner.

INVARIX models every exception as a **first-class promise in a living FalkorDB knowledge graph**—connecting Services, People, Teams, Controls, Exceptions, Compensating Controls, Evidence, and Customer-Facing Paths.

---

## 🏗️ Tri-Planar Architecture & Host Environment

INVARIX maintains three strictly isolated graphs per workspace:

| Graph | Name Format | Purpose |
| :--- | :--- | :--- |
| **Platform Graph** | `invarix_platform` | Workspace identity, user accounts, memberships, and machine API keys. |
| **Domain Graph** | `org_<ws_id>` | Living topology: Services, Waivers, Teams, People, Controls, and Customer Paths. |
| **Memory Graph** | `mem_<ws_id>` | Agent episodic conversations (`Turn`), semantic precedent (`Fact`), and runbooks (`Playbook`). |

```
Browser ──► Next.js 16 (App Router + Force-Directed WebGL Canvas)
   │
   └──REST + SSE (Bearer Token)──► FastAPI Backend (Port 8001) ──► FalkorDB (:6380)
                                       │                              ├── invarix_platform
                                       │                              ├── org_<ws_id>
                                       │                              └── mem_<ws_id>
                                       ├──► Nebius Token Factory (NVIDIA Nemotron 120B & 3.5 Lightning)
                                       └──► Tavily Threat Intelligence API
```

---

## 🛡️ Agent Invariants & 16 MCP Graph Reasoning Tools

INVARIX is governed by strict architectural guarantees:

1. **The LLM Never Writes Cypher**: Every graph traversal executes from named, parameterized Cypher files in `backend/app/graph/queries/`. This eliminates Cypher injection, hallucinated graph schemas, and runaway queries.
2. **Tools Are Read-Only**: Agent tools only read the graph. Any write or remediation is emitted as a structured `ProposedAction` requiring human sign-off.
3. **100% Grounded Output**: Every generated response passes through `backend/app/agents/guard.py`, which strips any entity ID not returned in graph tool results.
4. **Deterministic Tool Budget**: The agent conversation loop caps tool executions at **6 calls per turn** to control latency and prevent reasoning drift.
5. **16 Model Context Protocol (MCP) Tools**: Exposes mathematical Avalanche Centrality, temporal collision clustering, proof paths, precedent recall, and real-time Tavily threat intel over standardized JSON-RPC and REST endpoints (`/mcp/tools`).

---

## ⚡ 5-Minute Quickstart (Isolated Containerized Setup)

### 1. Launch Isolated Stack (Port 8001 & 6380)
```bash
docker compose -f docker-compose.invarix.yml up -d
```
* **Backend API**: `http://localhost:8001/health`
* **FalkorDB**: `localhost:6380`

### 2. Launch Next.js 16 Frontend (Port 3001)
```bash
cd frontend
pnpm install
pnpm dev -- -p 3001
```
Open **[http://localhost:3001/w/northwind-pay](http://localhost:3001/w/northwind-pay)** to explore the live interactive graph canvas, risk HUD, and Steward agent.

### 3. Run Pre-Merge CI Circuit Breaker
```bash
python scripts/cli.py check --api-url http://localhost:8001 --workspace northwind-pay --api-key rep_live_local --service svc_payments_gateway
```

---

## 🤖 AI Assistant Disclosure (Hackathon Compliance)

In compliance with hackathon regulations, AI coding assistants were utilized for boilerplate scaffolding, test generation, and documentation formatting. All architectural specifications, Cypher graph schemas, invariant detection logic, mathematical models, and verification suites were verified and directed by the project authors.

---

## 📄 License

MIT License — see [`LICENSE`](LICENSE) for details.
