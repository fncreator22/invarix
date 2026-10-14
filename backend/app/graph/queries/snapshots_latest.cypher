MATCH (s:Service)-[:HAS_SNAPSHOT]->(n:RiskSnapshot)
WITH s, n ORDER BY n.as_of DESC
WITH s, collect(n)[0] AS last
RETURN s.id AS service_id, last.score AS score, last.as_of AS as_of
