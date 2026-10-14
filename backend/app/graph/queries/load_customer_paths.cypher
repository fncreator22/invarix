UNWIND $rows AS r
MERGE (n:CustomerPath {id: r.id})
SET n.name = r.name, n.description = r.description, n.source = $source, n.created_at = coalesce(n.created_at, $now), n.created_by = coalesce(n.created_by, $actor)
WITH n, r
UNWIND r.service_ids AS sid
MATCH (s:Service {id: sid})
MERGE (n)-[:REQUIRES]->(s)
