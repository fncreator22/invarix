# INVARIX — Agent Guide

INVARIX exposes a set of read-only graph reasoning tools through two surfaces:
1. The **Steward** conversational agent (internal, streaming SSE via `/api/v1/workspaces/{ws_id}/chat`)
2. The **MCP endpoint** (external, any MCP-compatible agent client via `/api/v1/workspaces/{ws_id}/mcp/tools`)

## Architecture invariants

- The LLM **never writes Cypher**. All queries are named, parameterized files in `backend/app/graph/queries/*.cypher`.
- Tools are **reads only**. Writes are returned as `ProposedAction` objects that require human approval.
- Every response is **grounded**: the `agents/guard.py` module strips any entity ID that was not present in tool results before the response reaches the user.
- The Steward calls **at most 6 tools per turn** to prevent runaway inference costs.

## Available tools (14)

| Tool | Description |
|------|-------------|
| `list_alerts` | Active alerts in the workspace, ordered by severity |
| `get_alert` | Full alert detail including shortest proof path |
| `list_exceptions` | Active exceptions in the workspace |
| `get_exception` | Full exception detail with control, owner, services |
| `list_expiring` | Exceptions expiring within N days |
| `list_orphaned` | Exceptions whose owner has left or is inactive |
| `list_services` | Services with their risk score and exception count |
| `get_service` | Full service detail including dependency graph context |
| `proof_path` | Shortest proof path between two graph nodes |
| `predict_avalanche` | Avalanche centrality (P = p0^h) for a service over N days |
| `predict_expiry_collisions` | Temporal collision windows across sliding horizon |
| `what_if_as_of` | Full detection run at a future date (read-only, does not persist) |
| `propose_review` | Returns a ProposedAction to schedule a review (human must approve) |
| `recall_precedent` | Searches the memory graph for prior decisions on the same control/service |
| `recall_conversation_history` | Searches memory graph for prior conversation turns, topics, and past sessions |

## MCP endpoint

```
GET  /api/v1/workspaces/{ws_id}/mcp/tools          List tools with JSON Schema
POST /api/v1/workspaces/{ws_id}/mcp/tools/{name}   Execute a tool
```

Authentication: Bearer token (Clerk session JWT).

### Example — predict avalanche centrality

```bash
curl -X POST https://<api>/api/v1/workspaces/<ws_id>/mcp/tools/predict_avalanche \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"service_id": "svc_payments_gateway", "horizon_days": 30}'
```

Response shape follows the [MCP content envelope](https://modelcontextprotocol.io/docs/concepts/tools):
```json
{
  "content": [{ "type": "text", "text": "{...}" }],
  "isError": false,
  "_meta": { "tool": "predict_avalanche", "workspace_id": "ws_..." }
}
```

## Three-graph memory model (Track 02)

Each workspace has three FalkorDB graphs:

| Graph | Purpose |
|-------|---------|
| `platform_<prefix>` | Users, workspaces, memberships, notifications |
| `org_<ws_id>` | Domain data: exceptions, services, people, alerts, controls |
| `mem_<ws_id>` | Agent memory: Turn (episodic), Fact (semantic), Playbook (procedural), HandoffTask |

The Steward writes `Turn` and `Fact` nodes after every successful conversation turn.
`HandoffTask` nodes are created when critical alerts are resolved, so the next on-call agent inherits context.
`Playbook` nodes store built-in runbooks that are recalled when matching detection rules fire.

Cross-graph edges are impossible in FalkorDB — `mem` graph uses `Ref` stub nodes with `external_id` pointers.

## Steward conversation loop

```
user message
  → tool calls (≤6, parallel where safe)
    → groundedness check (strips uncited entity IDs)
      → memory write (Turn + any new Facts)
        → SSE stream to client
```

Code: `backend/app/agents/steward.py`
