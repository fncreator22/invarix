UNWIND $rows AS r
MERGE (n:Service {id: r.id})
SET n.name = r.name, n.tier = r.tier, n.customer_facing = r.customer_facing, n.description = r.description, n.source = $source, n.created_at = coalesce(n.created_at, $now), n.created_by = coalesce(n.created_by, $actor)
WITH n, r WHERE r.team_id IS NOT NULL
MATCH (t:Team {id: r.team_id})
MERGE (t)-[:OWNS]->(n)
