MATCH (u:User)-[m:MEMBER_OF]->(w:Workspace {id: $ws_id})
WHERE (m.status IS NULL OR m.status = 'active') AND m.role IN ['owner', 'admin']
RETURN u.id AS user_id, u.name AS name, u.email AS email, m.person_id AS person_id
