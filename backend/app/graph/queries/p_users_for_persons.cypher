// map org Person ids to workspace users (for notifications)
MATCH (u:User)-[m:MEMBER_OF]->(w:Workspace {id: $ws_id})
WHERE (m.status IS NULL OR m.status = 'active')
  AND m.person_id IN $person_ids
RETURN u.id AS user_id, m.person_id AS person_id
