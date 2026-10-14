// platform  params: $id, $clerk_user_id, $email, $name, $now
MERGE (u:User {clerk_user_id: $clerk_user_id})
ON CREATE SET u.id = $id, u.created_at = $now, u.status = 'active', u.prefs_json = '{}'
SET u.email = $email, u.name = coalesce($name, u.name), u.last_seen_at = $now
RETURN u.id AS id, u.email AS email, u.name AS name, u.prefs_json AS prefs_json, u.status AS status
