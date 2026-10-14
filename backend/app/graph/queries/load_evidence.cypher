UNWIND $rows AS r
MERGE (n:Evidence {id: r.id})
SET n.kind = r.kind, n.source_ref = r.source_ref, n.captured_at = r.captured_at, n.excerpt = r.excerpt, n.source = $source, n.created_at = coalesce(n.created_at, $now), n.created_by = coalesce(n.created_by, $actor)
WITH n, r
MATCH (e:Exception {id: r.exception_id})
MERGE (e)-[:EVIDENCED_BY]->(n)
