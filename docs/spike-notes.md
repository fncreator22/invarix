# Spike notes (FalkorDB, verified 2 Oct 2026)

Source of truth for Cypher written in `backend/app/graph/queries/`. Re-run before upgrading the image tag.

## Pinned versions

| Item | Value |
| --- | --- |
| Server image | `falkordb/falkordb:v4.22.0` (module `graph` ver `42200`). The `6.0.x` / `edge-rs` tags are the Rust rewrite: avoid until re-spiked. |
| Python client | `falkordb` (latest at kickoff, locked in `backend/uv.lock`) |
| Default server query timeout | `TIMEOUT 1000` ms (module arg); per-query `timeout=` (ms) works |

## Works (S-2 to S-8, S-11)

| Pattern | Result |
| --- | --- |
| `MATCH p=(s:Service)-[:DEPENDS_ON*0..2]->(t)<-[:AFFECTS]-(e) RETURN s.id, e.id, min(length(p))` | Correct hop counts (`*0..` supported) |
| Pattern predicates `WHERE NOT ()-[:RENEWS]->(l)` and `WHERE NOT (r)-[:RENEWS]->()` | Supported |
| `[n IN nodes(p) \| n.id]` in `RETURN` (no `ORDER BY` on `p`) | Supported |
| `CALL algo.pageRank('Service','DEPENDS_ON') YIELD node, score` | Works (positional label, relType) |
| `CALL algo.betweenness({nodeLabels:[..], relationshipTypes:[..]}) YIELD node, score` | Works (raw, not normalized) |
| `CALL algo.WCC({nodeLabels:[..], relationshipTypes:[..]}) YIELD node, componentId` | Works |
| `CALL algo.SPpaths({sourceNode:a, targetNode:b, relTypes:[..], relDirection:'both', pathCount:1, maxLen:6}) YIELD path` | Works **without** `weightProp` |
| `MERGE … ON CREATE SET … ON MATCH SET …` | Works |
| `UNWIND $rows AS r MERGE (n:L {id:r.id}) SET n += …` | Works; idempotent |
| `g.ro_query("CREATE …")` | Rejected (read-only enforced) |
| `labels(n)[0]`, `coalesce(...)`, `UNION` with matching aliases | Work |
| `create_node_unique_constraint` / `create_node_mandatory_constraint` | Return `PENDING`, become `OPERATIONAL` (poll `list_constraints()`); unique helper creates the range index. Duplicate insert and missing mandatory property are rejected. |
| `GRAPH.MEMORY USAGE <graph>` | Works (MB granularity; seed graph rounds to 0 MB) |

## Do not do

1. `shortestPath()` in `MATCH` → error "only supports shortestPaths in WITH or RETURN". Undirected `shortestPath` → unsupported. **Use `algo.SPpaths`** for generic proofs.
2. `RETURN [n IN nodes(p)|n.id] … ORDER BY length(p) LIMIT 1` → error "Unable to locate a value with alias p". **Sort in a `WITH` first:** `WITH p, length(p) AS l ORDER BY l LIMIT 1 RETURN …`.
3. (S-9 hazard) fixed-length var path with `all(n IN nodes(p) …)` plus `size(relationships(p))` in `WHERE` → error "Unable to resolve filtered alias". Build proofs from returned IDs instead.
4. `CREATE INDEX` on an already-indexed property raises "already indexed"; constraint re-creation raises "Constraint already exists". Bootstrap must check first or tolerate these messages.
5. Never copy Neo4j syntax (label expressions `:A|B`, regex `=~`, APOC).
6. Batch writes ≤ 500 rows per `UNWIND`.
7. MANDATORY constraints are checked at `MERGE` node creation, before `ON CREATE SET`. Only put MANDATORY on the merge key.
