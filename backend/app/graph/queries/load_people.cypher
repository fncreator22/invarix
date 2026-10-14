UNWIND $rows AS r
MERGE (n:Person {id: r.id})
SET n.name = r.name, n.email = r.email, n.title = r.title, n.role = r.role, n.status = r.status, n.source = $source, n.created_at = coalesce(n.created_at, $now), n.created_by = coalesce(n.created_by, $actor)
