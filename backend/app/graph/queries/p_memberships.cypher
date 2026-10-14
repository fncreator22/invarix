MATCH (u:User)-[m:MEMBER_OF]->(w:Workspace)
WHERE (u.id = $user_id OR (u.email IS NOT NULL AND $email IS NOT NULL AND u.email = $email))
  AND (m.status IS NULL OR m.status = 'active' OR m.status = 'ready')
  AND w.status <> 'deleting'
WITH w, m
ORDER BY w.created_at ASC
RETURN DISTINCT w.id AS workspace_id, w.slug AS slug, w.name AS name, coalesce(m.role, 'viewer') AS role, m.person_id AS person_id, w.status AS status

