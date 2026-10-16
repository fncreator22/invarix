# Original User Request

## 2026-10-15T22:53:18Z

Build and launch **Reprieve**: an autonomous agentic engine that turns fragmented software exceptions, security waivers, and technical debt overrides into a verifiable, tri-planar knowledge graph that detects cascading multi-service risk collisions before production deployment.

Working directory: d:\hackthon\Nvidea
Integrity mode: development

## Requirements

### R1. Tri-Planar Knowledge Graph & Invariant Detection (FalkorDB)
Construct and query a tri-planar graph (Platform, Domain, Memory) using FalkorDB (Redis protocol). Implement and verify the 8 deterministic invariants (R1–R8) detecting expiry runway, orphaned owners, shared SPOFs, service concentrations, renewal treadmills, and customer-path exposures.

### R2. Deterministic Prediction & Avalanche Centrality
Implement the mathematical Avalanche Centrality engine:
$$AC(u) = 1 - \prod_{p \in \text{Paths}(u \to \text{Ingress})} (1 - p_0^{\text{len}(p)})$$
Simulate failure cascade probabilities and predict sliding-horizon temporal collisions across shared critical paths.

### R3. Multi-Agent Reasoning via Nebius Token Factory & NVIDIA Nemotron
Wire the multi-agent swarm (Sentinel, Steward) to **Nebius Token Factory** endpoints using OpenAI-compatible APIs:
- `nebius/nvidia/Nemotron-3_5-Lightning` for monorepo and manifest ingestion (1M context).
- `nebius/nvidia/nemotron-3-super-120b-a12b` for multi-hop causal reasoning and natural-language proof path explanations.
- Provenance Guardrail (`guard.py`) ensuring zero hallucinated entity IDs in output citations.

### R4. External Threat Intelligence via Tavily Search API
Integrate the `tavily_search_threat_intel` tool into the agent tool registry (`backend/app/agents/tools.py`) to query active in-the-wild exploits and EOL advisories for waived CVEs and third-party packages, qualifying for the Devpost $3,000 Tavily bounty.

### R5. Interactive UI & Pre-Merge CI Gate
Deliver a high-fidelity Next.js 16 / React 19 interface with force-directed 2D/WebGL graph canvas, interactive Steward chat with SSE streaming, and a pre-merge CLI gate (`reprieve scan --pr`) that blocks risky pull requests in CI/CD.

## Acceptance Criteria

### Technical & Rule Verification
- [ ] Backend starts cleanly on FastAPI with FalkorDB and exposes `/v1` endpoints.
- [ ] Agent execution routes through Nebius Token Factory (`COMPAT_BASE_URL` and `COMPAT_API_KEY`) targeting NVIDIA Nemotron models.
- [ ] `tavily_search_threat_intel` tool executes and returns search results or clear API key warnings without crashing.
- [ ] Deterministic shortest proof paths are generated for all invariant violations without hallucinated node IDs.
- [ ] `scripts/cli.py` executes `scan --pr` simulation and outputs risk bands and SPOF ranks.
- [ ] Frontend displays interactive force-directed graph with live pulsating risk highlights on vulnerable nodes.
