MATCH (w:Workspace {id: $ws_id})
OPTIONAL MATCH (k:ApiKey)-[:FOR]->(w)
DETACH DELETE k
DETACH DELETE w
