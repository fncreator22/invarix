UNWIND $rows AS r
MERGE (n:Exception {id: r.id})
SET n.title = r.title, n.kind = r.kind, n.status = r.status, n.severity = r.severity,
    n.granted_at = r.granted_at, n.expires_at = r.expires_at, n.description = r.description,
    n.condition_expr = r.condition_expr, n.condition_met = r.condition_met,
    n.requester_kind = coalesce(r.requester_kind, 'person'), n.closed_at = r.closed_at,
    n.closed_reason = r.closed_reason, n.revoked_at = r.revoked_at, n.version = coalesce(n.version, 1), n.source = $source, n.created_at = coalesce(n.created_at, $now), n.created_by = coalesce(n.created_by, $actor)
WITH n, r
MATCH (c:Control {id: r.control_id}), (o:Person {id: r.owner_id})
MERGE (n)-[:WAIVES]->(c)
MERGE (n)-[ob:OWNED_BY]->(o) ON CREATE SET ob.since = r.granted_at
WITH n, r
OPTIONAL MATCH (a:Person {id: r.approver_id})
FOREACH (_ IN CASE WHEN a IS NULL THEN [] ELSE [1] END | MERGE (n)-[ab:APPROVED_BY]->(a) ON CREATE SET ab.at = r.granted_at)
WITH n, r
UNWIND r.service_ids AS sid
MATCH (s:Service {id: sid})
MERGE (n)-[:AFFECTS]->(s)
