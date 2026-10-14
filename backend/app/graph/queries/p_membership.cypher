// one workspace for one user (404 when absent)
MATCH (u:User)-[m:MEMBER_OF]->(w:Workspace {id: $ws_id})
WHERE (u.id = $user_id OR (u.email IS NOT NULL AND $email IS NOT NULL AND u.email = $email))
  AND (m.status IS NULL OR m.status = 'active' OR m.status = 'ready')
  AND w.status <> 'deleting'
RETURN w AS w, coalesce(m.role, 'viewer') AS role, m.person_id AS person_id

