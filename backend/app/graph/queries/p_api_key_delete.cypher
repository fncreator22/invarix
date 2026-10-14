MATCH (k:ApiKey {id: $id})-[:FOR]->(w:Workspace {id: $ws_id})
DETACH DELETE k
