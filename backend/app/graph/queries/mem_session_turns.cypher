MATCH (s:Session {id: $id, user_id: $user_id})
OPTIONAL MATCH (s)-[:HAS_TURN]->(t:Turn)
WITH s, t ORDER BY t.idx ASC
RETURN s AS s, collect(t) AS turns
