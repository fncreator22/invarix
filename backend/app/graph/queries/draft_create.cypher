// staged draft from text ingestion: edges only for resolved IDs (unresolved ones are completed on approve)
CREATE (e:Exception {id: $id, title: $title, kind: $kind, status: 'draft', severity: $severity, granted_at: $granted_at,
                     expires_at: $expires_at, description: $description, requester_kind: 'person', version: 1,
                     source: 'ingest', created_at: $now, created_by: $actor, staged_json: $staged_json})
WITH e
OPTIONAL MATCH (c:Control {id: $control_id})
FOREACH (_ IN CASE WHEN c IS NULL THEN [] ELSE [1] END | MERGE (e)-[:WAIVES]->(c))
WITH e
OPTIONAL MATCH (o:Person {id: $owner_id})
FOREACH (_ IN CASE WHEN o IS NULL THEN [] ELSE [1] END | MERGE (e)-[r:OWNED_BY]->(o) ON CREATE SET r.since = $granted_at)
WITH e
OPTIONAL MATCH (a:Person {id: $approver_id})
FOREACH (_ IN CASE WHEN a IS NULL THEN [] ELSE [1] END | MERGE (e)-[:APPROVED_BY]->(a))
WITH e
UNWIND (CASE WHEN size($service_ids) = 0 THEN [null] ELSE $service_ids END) AS sid
OPTIONAL MATCH (s:Service {id: sid})
FOREACH (_ IN CASE WHEN s IS NULL THEN [] ELSE [1] END | MERGE (e)-[:AFFECTS]->(s))
RETURN DISTINCT e.id AS id
