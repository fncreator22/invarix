MATCH (k:ApiKey {id: $id})-[:FOR]->(w:Workspace {id: $ws_id})
SET k.revoked = true, k.revoked_at = $now
RETURN k AS k
