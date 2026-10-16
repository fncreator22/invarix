MATCH (u:User {id: $user_id})
MATCH (w:Workspace) WHERE w.id = $ws_id OR w.slug = $ws_id
MERGE (u)-[m:MEMBER_OF]->(w)
ON CREATE SET m.role = 'viewer', m.status = 'ready', m.joined_at = timestamp()
SET m.person_id = $person_id
RETURN m.person_id AS person_id
