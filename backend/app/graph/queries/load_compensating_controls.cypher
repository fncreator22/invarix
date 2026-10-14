UNWIND $rows AS r
MERGE (n:CompensatingControl {id: r.id})
SET n.description = r.description, n.last_verified_at = r.last_verified_at, n.verified_ok = r.verified_ok,
    n.verify_interval_days = coalesce(r.verify_interval_days, 30), n.source = $source, n.created_at = coalesce(n.created_at, $now), n.created_by = coalesce(n.created_by, $actor)
WITH n, r
UNWIND r.relies_on AS rid
MATCH (x) WHERE x.id = rid
MERGE (n)-[:RELIES_ON]->(x)
