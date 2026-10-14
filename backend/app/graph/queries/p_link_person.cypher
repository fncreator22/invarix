MATCH (u:User {id: $user_id})-[m:MEMBER_OF]->(w:Workspace {id: $ws_id})
WHERE (m.status IS NULL OR m.status = 'active')
SET m.person_id = $person_id
RETURN m.person_id AS person_id
