// explorer: domain nodes only  params: $labels, $limit
MATCH (n) WHERE labels(n)[0] IN $labels
RETURN n.id AS id, labels(n)[0] AS label, coalesce(n.name, n.title, n.description, n.id) AS name,
       n.severity AS severity, n.status AS status, n.risk_score AS score
ORDER BY label, id
LIMIT $limit
