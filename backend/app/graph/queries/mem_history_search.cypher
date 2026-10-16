// params: $user_id, $q, $limit
MATCH (s:Session {user_id: $user_id})-[:HAS_TURN]->(t:Turn)
WHERE ($q = '' OR toLower(coalesce(t.content, '')) CONTAINS $q)
RETURN s.id AS session_id, coalesce(s.title, 'Untitled') AS session_title, t.id AS turn_id, t.role AS role, t.content AS content, t.created_at AS created_at
ORDER BY t.created_at DESC
LIMIT $limit
