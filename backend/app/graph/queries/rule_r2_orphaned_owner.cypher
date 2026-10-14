// Q-R2  params: $as_of
MATCH (e:Exception {status:'active'})-[:OWNED_BY]->(p:Person)
OPTIONAL MATCH (e)-[:AFFECTS]->(:Service)<-[:OWNS]-(t:Team)
WITH e, p, collect(DISTINCT t.id) AS owning_team_ids
OPTIONAL MATCH (p)-[m:MEMBER_OF]->(t2:Team)
WHERE t2.id IN owning_team_ids AND m.since <= $as_of AND (m.until IS NULL OR m.until > $as_of)
WITH e, p, owning_team_ids, count(m) AS current_memberships
WHERE p.status <> 'active' OR (size(owning_team_ids) > 0 AND current_memberships = 0)
RETURN e.id AS exception_id, e.title AS title, e.severity AS severity, p.id AS owner_id, p.name AS owner_name,
       CASE WHEN p.status <> 'active' THEN 'left' ELSE 'moved' END AS reason, owning_team_ids
