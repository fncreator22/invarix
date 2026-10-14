// params: $as_of, $q
MATCH (p:Person) WHERE $q IS NULL OR toLower(p.name) CONTAINS $q OR toLower(coalesce(p.email, '')) CONTAINS $q
OPTIONAL MATCH (p)-[m:MEMBER_OF]->(t:Team) WHERE m.since <= $as_of AND (m.until IS NULL OR m.until > $as_of)
OPTIONAL MATCH (e:Exception {status: 'active'})-[:OWNED_BY]->(p)
RETURN p AS p, collect(DISTINCT {id: t.id, name: t.name}) AS teams, count(DISTINCT e) AS owned_active
ORDER BY p.name
