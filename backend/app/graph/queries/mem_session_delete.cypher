MATCH (s:Session {id: $id, user_id: $user_id})
OPTIONAL MATCH (s)-[:HAS_TURN]->(t:Turn)
DELETE t, s
RETURN count(s) AS n
