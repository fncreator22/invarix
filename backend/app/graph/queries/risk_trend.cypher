MATCH (:Service {id: $service_id})-[:HAS_SNAPSHOT]->(n:RiskSnapshot)
WHERE n.as_of >= $since
RETURN n.as_of AS as_of, n.score AS score, n.band AS band
ORDER BY n.as_of ASC
