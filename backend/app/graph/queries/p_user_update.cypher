MATCH (u:User {id: $user_id})
SET u.name = coalesce($name, u.name), u.prefs_json = coalesce($prefs_json, u.prefs_json)
RETURN u.id AS id, u.email AS email, u.name AS name, u.prefs_json AS prefs_json
