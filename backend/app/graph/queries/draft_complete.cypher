// approve: replace edges with the reviewer-confirmed IDs, then activate  params: $id, $control_id, $owner_id, $service_ids, $expires_at, $severity, $title, $now
MATCH (e:Exception {id: $id, status: 'draft'}), (c:Control {id: $control_id}), (o:Person {id: $owner_id, status: 'active'})
OPTIONAL MATCH (e)-[old]->(:Control) DELETE old
WITH DISTINCT e, c, o
OPTIONAL MATCH (e)-[old2:OWNED_BY]->(:Person) DELETE old2
WITH DISTINCT e, c, o
OPTIONAL MATCH (e)-[old3:AFFECTS]->(:Service) DELETE old3
WITH DISTINCT e, c, o
MERGE (e)-[:WAIVES]->(c)
MERGE (e)-[r:OWNED_BY]->(o) ON CREATE SET r.since = e.granted_at
SET e.status = 'active', e.expires_at = $expires_at, e.severity = $severity, e.title = $title, e.version = e.version + 1,
    e.updated_at = $now, e.staged_json = null
WITH e
UNWIND $service_ids AS sid
MATCH (s:Service {id: sid})
MERGE (e)-[:AFFECTS]->(s)
RETURN DISTINCT e.id AS id
