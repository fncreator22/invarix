MATCH (k:ApiKey)-[:FOR]->(w:Workspace {id: $ws_id})
RETURN k AS k
ORDER BY k.created_at DESC
