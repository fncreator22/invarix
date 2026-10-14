// params: $id, $slug, $name, $data_mode, $clock_mode, $as_of, $user_id, $now, $schema_version
MATCH (u:User {id: $user_id})
CREATE (w:Workspace {id: $id, slug: $slug, name: $name, status: 'provisioning', data_mode: $data_mode,
                     clock_mode: $clock_mode, as_of: $as_of, ai_mode: 'cloud', plan: 'free', quotas_json: '{}',
                     onboarding_step: 'identity', onboarding_done: false, dirty: true, schema_version: $schema_version,
                     created_at: $now, created_by: $user_id})
CREATE (u)-[:MEMBER_OF {role: 'owner', status: 'active', joined_at: $now}]->(w)
RETURN w.id AS id
