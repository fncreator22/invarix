// Recorded owner validity and approver for owner resolution (03 §9.2)  params: $exception_id, $as_of
MATCH (e:Exception {id:$exception_id})-[:OWNED_BY]->(o:Person)
OPTIONAL MATCH (e)-[:AFFECTS]->(:Service)<-[:OWNS]-(t:Team)
WITH e, o, collect(DISTINCT t.id) AS team_ids
OPTIONAL MATCH (o)-[m:MEMBER_OF]->(t2:Team)
WHERE t2.id IN team_ids AND m.since <= $as_of AND (m.until IS NULL OR m.until > $as_of)
WITH e, o, team_ids, count(m) AS cur
OPTIONAL MATCH (e)-[:APPROVED_BY]->(a:Person)
RETURN o.id AS owner_id, o.name AS owner_name, o.status AS owner_status,
       (o.status = 'active' AND (size(team_ids) = 0 OR cur > 0)) AS owner_valid,
       a.id AS approver_id, a.name AS approver_name, a.status AS approver_status
