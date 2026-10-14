// Q-NBR (both directions)  params: $ids, $labels, $limit
MATCH (c)-[r]-(n) WHERE c.id IN $ids AND labels(n)[0] IN $labels
RETURN DISTINCT n.id AS id, labels(n)[0] AS label, coalesce(n.name, n.title, n.description, n.id) AS name,
       n.severity AS severity, n.status AS status, n.risk_score AS score
LIMIT $limit
