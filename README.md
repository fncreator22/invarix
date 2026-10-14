# Reprieve — Graph-Native Risk Reasoning Engine

> **Individually reasonable exceptions add up to one unreasonable risk. Reprieve is the agent that sees the sum.**

Built for **Graph Hacks: Context for AI Agents** (WeMakeDevs × FalkorDB).

---

## 🎯 Track Submissions

* **Track 03: Company Brain (Primary)**: Unifies services, people, teams, controls, and waivers into a single living graph to map architectural risk, answer executive questions, and trace liability back to its origin.
* **Track 02: Agent Memory and Coordination (Secondary)**: Implements isolated episodic (Turn) and semantic (Fact/Playbook) memory per tenant inside FalkorDB (`mem_<ws_id>`), allowing agents to recall prior approval rationales and coordinate on-call handoffs.
* **Track 01: Agents That Act on Connected Data**: Exposes 14 read-only graph reasoning tools over the Model Context Protocol (MCP) to compute avalanche centrality, shortest proof paths, and blast radius simulations.

---

## 🔍 The Problem

Engineering organizations issue temporary waivers constantly:
* A skipped integration test to meet a launch deadline
* A temporary data export script running with elevated database permissions
* An unencrypted fallback connection while waiting on a certificate rotation

Individually, every waiver is defensible. But together, they pile up on the same root database, lean on an orphaned engineer who left the company three months ago, or expire simultaneously during Black Friday traffic.

### Why Relational & Vector Databases Fail
* **Relational (SQL)** databases choke on recursive multi-hop dependency joins across deep microservice topologies.
* **Vector Search** can find semantically similar documents, but cannot determine structural reachability (e.g., *"Does an unencrypted cache 4 hops away impact the PCI-scoped payment vault?"*).
* **FalkorDB** stores these relationships directly as nodes and edges. Queries follow paths in milliseconds, computing PageRank and betweenness centrality on every agent turn.

---

## 🏗️ Tri-Planar Architecture

Reprieve leverages FalkorDB's multigraph topology to maintain three strictly isolated graphs per workspace:

| Graph | Name Format | Purpose |
| :--- | :--- | :--- |
| **Platform Graph** | `platform_<prefix>` | Workspace identity, user accounts, memberships, and API keys. |
| **Domain Graph** | `org_<ws_id>` | Living topology: Services, Waivers, Teams, People, Controls, and Customer Paths. |
| **Memory Graph** | `mem_<ws_id>` | Agent episodic conversations (`Turn`), semantic precedent (`Fact`), and runbooks (`Playbook`). |

```
Browser ──► Next.js 16 (App Router)
   │
   └──REST + SSE (Bearer Token)──► FastAPI Backend ──► FalkorDB (:6379)
                                       │                 ├── platform_<prefix>
                                       │                 ├── org_<ws_id>
                                       │                 └── mem_<ws_id>
                                       └──► OpenAI-Compatible LLM (Ollama / Cloud)
```

---

## 🛡️ Agent Reasoning Invariants & MCP

Reprieve is governed by four strict architectural guarantees:

1. **The LLM Never Writes Cypher**: Every graph traversal is executed from named, parameterized Cypher files. This eliminates Cypher injection, hallucinated graph schemas, and runaway queries.
2. **Tools Are Read-Only**: Agent tools only read the graph. Any write or remediation is emitted as a structured `ProposedAction` requiring human sign-off.
3. **100% Grounded Output**: Every generated response passes through a verification guard that strips any entity ID not returned in graph tool results.
4. **Deterministic Tool Budget**: The agent conversation loop caps tool executions at **6 calls per turn** to control latency and prevent reasoning drift.

---

## ⚡ 5-Minute Quickstart (Local)

### Prerequisites
* Docker & Docker Compose
* Python 3.11+
* Node.js LTS & pnpm

### 1. Start FalkorDB
```bash
docker compose up -d falkordb
# FalkorDB is live on localhost:6379
# FalkorDB Browser is live on localhost:3001
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
uvicorn app.main:app --reload --port 8000
```
API health endpoint is available at `http://localhost:8000/health`.

---

## 🤖 AI Assistant Disclosure (Hackathon Rule R11)

In compliance with Hackathon Rule R11, AI coding assistants were utilized as pair programmers for boilerplate scaffolding, test generation, and documentation formatting. All architectural decisions, Cypher graph schemas, invariant detection logic, and verification suites were verified and directed by the project author.

---

## 📄 License

MIT License — see [`LICENSE`](LICENSE) for details.
