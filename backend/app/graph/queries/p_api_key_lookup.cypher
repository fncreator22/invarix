MATCH (k:ApiKey {secret_hash: $secret_hash})-[:FOR]->(w:Workspace)
RETURN k AS k, w.id AS ws_id
