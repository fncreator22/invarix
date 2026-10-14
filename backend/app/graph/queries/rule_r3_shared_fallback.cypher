// Q-R3  params: $k
MATCH (e:Exception {status:'active'})-[:COMPENSATED_BY]->(cc:CompensatingControl)-[:RELIES_ON]->(x)
WITH x, collect(DISTINCT e.id) AS exception_ids, collect(DISTINCT [e.id, cc.id]) AS pairs, max(e.severity) AS max_severity
WHERE size(exception_ids) >= $k
RETURN x.id AS dependency_id, labels(x)[0] AS dependency_kind, x.name AS dependency_name,
       exception_ids, pairs, max_severity
