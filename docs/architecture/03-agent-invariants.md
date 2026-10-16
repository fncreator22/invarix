# Agent Reasoning Invariants & MCP Specification

INVARIX exposes its graph intelligence through the **Steward** conversational assistant and external **Model Context Protocol (MCP)** tool endpoints.

## Core Architectural Invariants

1. **No Raw LLM Cypher Generation**:
   The LLM **never writes dynamic Cypher**. All graph queries are static, named, and parameterized Cypher templates to guarantee deterministic execution and prevent query injection.

2. **Read-Only Reasoning Tools**:
   Agent tools are strictly read-only. Any proposed changes are emitted as structured `ProposedAction` objects that require explicit human approval before execution.

3. **100% Grounded Output**:
   Every response passes through an entity guard. Any entity ID in the agent's prose that was not returned by living graph query results is stripped before streaming to the client.

4. **Deterministic Tool Budget**:
   The agent loop enforces a strict ceiling of **at most 6 tool calls per turn** to eliminate runaway inference costs and hallucination drift.

---

## The 14 Read-Only Graph Tools

| Tool | Purpose |
| :--- | :--- |
| `list_alerts` | Active risk alerts ordered by severity |
| `get_alert` | Full alert detail including shortest proof path |
| `list_exceptions` | Active policy exceptions across workspace |
| `get_exception` | Exception details with control, owner, and services |
| `list_expiring` | Exceptions expiring within N days |
| `list_orphaned` | Waivers whose owner is inactive or has left the organization |
| `list_services` | Services ranked by compound topological risk score |
| `get_service` | Service detail with dependency graph context |
| `proof_path` | Shortest proof path between two arbitrary graph nodes |
| `predict_avalanche` | Avalanche centrality simulation ($P = p_0^h$) |
| `predict_expiry_collisions` | Temporal collision windows across a sliding time horizon |
| `what_if_as_of` | Future-date detection simulation (read-only) |
| `propose_review` | Returns a ProposedAction for human sign-off |
| `recall_precedent` | Recalls prior review rationales from memory graph |
