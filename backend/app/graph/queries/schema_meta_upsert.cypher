MERGE (m:SchemaMeta {key: 'schema'}) SET m.version = $version, m.applied_at = $now
