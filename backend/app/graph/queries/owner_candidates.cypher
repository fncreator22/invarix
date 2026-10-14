// Q-OWN  params: $exception_id, $as_of
MATCH (e:Exception {id:$exception_id})-[:AFFECTS]->(s:Service)<-[:OWNS]-(t:Team)
MATCH (lead:Person {status:'active'})-[l:LEADS]->(t)
WHERE l.since <= $as_of AND (l.until IS NULL OR l.until > $as_of)
RETURN lead.id AS person_id, lead.name AS name, t.id AS team_id, t.name AS team,
       count(DISTINCT s) AS services_owned, l.since AS lead_since, collect(DISTINCT s.id)[0] AS service_id
ORDER BY services_owned DESC, lead_since ASC
