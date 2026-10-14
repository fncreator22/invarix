// params: $as_of, $window_s, $statuses, $effective, $kinds, $severities, $service_id, $owner_id, $expiring_s, $q, $skip, $limit
MATCH (e:Exception)-[:WAIVES]->(c:Control)
MATCH (e)-[:OWNED_BY]->(o:Person)
WHERE ($statuses IS NULL OR e.status IN $statuses) AND ($kinds IS NULL OR e.kind IN $kinds)
  AND ($severities IS NULL OR e.severity IN $severities) AND ($owner_id IS NULL OR o.id = $owner_id)
  AND ($service_id IS NULL OR (e)-[:AFFECTS]->(:Service {id: $service_id}))
  AND ($expiring_s IS NULL OR (e.status = 'active' AND e.expires_at <= $as_of + $expiring_s))
  AND ($q IS NULL OR toLower(e.title) CONTAINS $q OR e.id CONTAINS $q)
WITH e, c, o, CASE WHEN e.status = 'active' AND e.expires_at < $as_of THEN 'expired'
                   WHEN e.status = 'active' AND e.expires_at <= $as_of + $window_s THEN 'expiring'
                   ELSE e.status END AS eff
WHERE $effective IS NULL OR eff IN $effective
WITH e, c, o, eff, CASE e.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END AS bucket
ORDER BY bucket, e.expires_at ASC, e.id ASC SKIP $skip LIMIT $limit
OPTIONAL MATCH (e)-[:AFFECTS]->(s:Service)
OPTIONAL MATCH (a:Alert)-[:INVOLVES]->(e) WHERE a.status <> 'resolved'
RETURN e AS e, eff, bucket, {id: c.id, name: c.name} AS control, {id: o.id, name: o.name, status: o.status} AS owner,
       collect(DISTINCT {id: s.id, name: s.name}) AS services, collect(DISTINCT a.id) AS alert_ids
ORDER BY bucket, e.expires_at ASC, e.id ASC
