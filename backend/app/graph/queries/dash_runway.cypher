// Q-DASH-RUNWAY  params: $as_of, $horizon_s
MATCH (t:Team)-[:OWNS]->(s:Service)<-[:AFFECTS]-(e:Exception {status: 'active'})
WHERE e.expires_at <= $as_of + $horizon_s
WITH DISTINCT t, e
RETURN t.id AS team_id, t.name AS team, e.id AS exception_id, e.title AS title, e.expires_at AS expires_at,
       e.severity AS severity
ORDER BY expires_at ASC
