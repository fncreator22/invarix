// params: $statuses, $person_id, $skip, $limit
MATCH (r:Review)
WHERE ($statuses IS NULL OR r.status IN $statuses)
  AND ($person_id IS NULL OR (r)-[:ASSIGNED_TO]->(:Person {id: $person_id}))
WITH r ORDER BY r.opened_at DESC, r.id ASC SKIP $skip LIMIT $limit
MATCH (r)-[:ABOUT]->(a:Alert), (r)-[:CONCERNS]->(e:Exception)
RETURN r AS r, {id: a.id, name: a.title} AS alert, {id: e.id, name: e.title} AS exception
ORDER BY r.opened_at DESC, r.id ASC
