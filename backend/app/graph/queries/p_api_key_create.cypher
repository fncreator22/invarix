MATCH (w:Workspace {id: $ws_id})
CREATE (k:ApiKey {
  id: $id,
  name: $name,
  prefix: $prefix,
  preview: $preview,
  secret_hash: $secret_hash,
  role: $role,
  scopes_json: $scopes_json,
  created_by: $created_by,
  created_at: $created_at,
  expires_at: $expires_at,
  last_used_at: null,
  revoked: false,
  revoked_at: null
})
CREATE (k)-[:FOR]->(w)
RETURN k AS k
