MATCH (u:User)-[m:MEMBER_OF]->(w:Workspace {id: $ws_id})
WHERE (m.status IS NULL OR m.status = 'active')
RETURN u.id AS user_id, u.email AS email, u.name AS name, coalesce(m.role, 'viewer') AS role, m.person_id AS person_id
ORDER BY m.joined_at ASC
