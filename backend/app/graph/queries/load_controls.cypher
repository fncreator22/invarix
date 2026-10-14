UNWIND $rows AS r
MERGE (n:Control {id: r.id})
SET n.name = r.name, n.framework = r.framework, n.severity_weight = coalesce(r.severity_weight, 3),
    n.description = r.description, n.source = $source, n.created_at = coalesce(n.created_at, $now), n.created_by = coalesce(n.created_by, $actor)
