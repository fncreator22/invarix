MATCH (e:Exception {id: $id}), (p:Person {id: $owner_id, status: 'active'})
OPTIONAL MATCH (e)-[old:OWNED_BY]->(:Person)
DELETE old
WITH DISTINCT e, p
MERGE (e)-[r:OWNED_BY]->(p) ON CREATE SET r.since = $as_of
SET e.version = e.version + 1, e.updated_at = $now
RETURN e.id AS id
