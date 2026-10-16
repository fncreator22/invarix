# INVARIX Technology Invariance & Pluggable Engine Architecture

> **Architectural Guarantee**: INVARIX’s invariant detection logic, mathematical cascade calculations, and 16 MCP graph reasoning tools are **100% decoupled from underlying infrastructure technologies**. Swapping the graph database, LLM provider, search engine, or identity provider requires **zero business logic modifications**.

---

## 1. The Technology Invariance Matrix

| Architectural Layer | Default Implementation | Pluggable Alternatives | Swapping Mechanism | Invariance Guarantee |
| :--- | :--- | :--- | :--- | :--- |
| **Graph Storage Engine** | **FalkorDB** (GraphBLAS sparse matrix OpenCypher) | **PostgreSQL Dual-Engine** (Relational tables + Recursive CTEs), **In-Memory NetworkX/CSR** | `GRAPH_BACKEND=falkordb` vs `GRAPH_BACKEND=postgres` in `.env` | `Repo` abstraction (`app/graph/adapter.py`). Upper-layer agents, invariants, and tools call named query IDs; zero raw DB code in business logic. |
| **AI Inference Backend** | **Nebius Token Factory** | **NVIDIA NIM / Studio**, **Local Ollama**, **OpenAI** | `LLM_PRIMARY=compat` vs `local` vs `openai` in `.env` | LLM **never writes Cypher**. Prompts only parameterize read-only MCP tools; `guard.py` enforces 100% groundedness. |
| **Ingestion Pipeline** | **NVIDIA Nemotron-3.5-Lightning** (1M Context) | **Local YAML / AST AST Parser** (`manifest_scanner.py`) | Automatic fallback if AI provider is offline | Emits uniform `TopologyIngestResult`; works in air-gapped CI/CD environments. |
| **Threat Intelligence** | **Tavily AI Search** | **Local CVE Heuristics**, **NVD / OSV Relays** | `TAVILY_API_KEY` present vs absent | Threat multiplier ($1.35\times$) applies dynamically; system never crashes if search provider times out. |
| **Authentication & IAM** | **Clerk** (Session JWTs & Webhooks) | **Dev Auth** (`Claims("dev_local")`), **OAuth2 / OIDC** | `DEV_AUTH=true` in local/CI environments | Role-based context (`WorkspaceContext`) is identical across machine API keys, dev tokens, and Clerk JWTs. |
| **CI/CD Orchestration** | **GitHub Actions** | **GitLab CI**, **Jenkins**, **Pre-commit hooks** | Standalone `scripts/cli.py` binary | Pure exit-code contract (`0` = Pass, `1` = Block, `2` = Error); diff-aware (`--changed-files`). |

---

## 2. Resolving the Dual-Engine Dilemma: FalkorDB vs. PostgreSQL

During architecture reviews, two competing requirements emerged:
1. **Early-Stage & Visual Power**: The need for rapid graph traversal, sub-5ms path reachability, and direct 2D WebGL canvas exploration (FalkorDB's strength).
2. **Enterprise Compliance & Relational Stability**: The enterprise requirement to avoid another dedicated database and store operational debt inside existing PostgreSQL / Amazon Aurora clusters with strict ACID guarantees (PostgreSQL's strength).

### The Solution: The Pluggable `BaseGraphDriver` Adapter

In `backend/app/graph/adapter.py`, INVARIX introduces a polymorphic driver abstraction:

```
+---------------------------------------------------------------------------------------------+
|                           INVARIX APPLICATION LOGIC & AGENTS                                |
|   (Sentinel Invariants R1-R8, Avalanche Centrality AC(u), 16 MCP Graph Reasoning Tools)     |
+---------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------+
|                                    Repo (app/graph/repo.py)                                 |
|            Unified interface: .read(qid), .write(qid), .write_batched(qid)                  |
+---------------------------------------------------------------------------------------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
+------------------------------------------+     +------------------------------------------+
|       FalkorDBDriver (GraphBLAS)         |     |       DualEnginePostgresAdapter          |
|  • Ultra-fast sparse matrix traversal    |     |  • Relational node/edge tables in SQL    |
|  • Native OpenCypher execution           |     |  • Recursive CTE path reachability       |
|  • Sub-5ms p95 latencies for WebGL HUD   |     |  • 100% standard enterprise Postgres/ACID|
+------------------------------------------+     +------------------------------------------+
```

### Zero-Breakage Invariant Guarantee
Because the entire backend codebase communicates **exclusively** through `Repo(db, graph_name)`, changing `GRAPH_BACKEND` in `.env`:
* **Does NOT break** the 16 MCP tools.
* **Does NOT break** the Sentinel detection rules (R1 to R8).
* **Does NOT break** the Next.js interactive force-directed canvas.
* **Does NOT break** the pre-merge CI/CD circuit breaker.

---

## 3. Practical Tool Swapping Examples

### Scenario A: Air-Gapped / Zero-Container Local Evaluation
If a developer or CI worker does not have Docker or Redis installed:
```bash
# In backend/.env
GRAPH_BACKEND=memory
LLM_PRIMARY=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=qwen3:8b
DEV_AUTH=true
```
The entire application boots on SQLite/In-memory graphs and local Ollama inference without external dependencies.

### Scenario B: Nebius Token Factory & NVIDIA Production Deployment
```bash
# In backend/.env
GRAPH_BACKEND=falkordb
FALKORDB_HOST=invarix-falkordb
FALKORDB_PORT=6379
LLM_PRIMARY=compat
COMPAT_BASE_URL=https://api.tokenfactory.nebius.ai/v1
COMPAT_API_KEY=neb_production_key_here
COMPAT_MODEL=nvidia/nemotron-3-super-120b-a12b
COMPAT_MODEL_INGEST=nebius/nvidia/Nemotron-3_5-Lightning
TAVILY_API_KEY=tvly_production_key_here
```
Harnesses Nebius Token Factory for sub-second inference, Nemotron-3.5-Lightning for 1M-token manifest ingestion, FalkorDB for real-time WebGL rendering, and Tavily for live threat intelligence multipliers.

---

## 4. Summary

INVARIX is engineered for **absolute modular independence**. Technology choices are operational deployment details, not architectural lock-ins.
