MATCH (k:ApiKey {id: $id})-[:FOR]->(w:Workspace {id: $ws_id})
RETURN k AS k
