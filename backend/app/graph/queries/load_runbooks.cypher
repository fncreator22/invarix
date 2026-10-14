UNWIND $rows AS r
MERGE (n:Runbook {id: r.id})
SET n.name = r.name, n.url = r.url, n.source = $source, n.created_at = coalesce(n.created_at, $now), n.created_by = coalesce(n.created_by, $actor)
