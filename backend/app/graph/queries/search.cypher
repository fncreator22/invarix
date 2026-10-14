// params: $q (lowercase), $labels, $limit
MATCH (n) WHERE labels(n)[0] IN $labels
  AND (toLower(coalesce(n.name, n.title, '')) CONTAINS $q OR n.id CONTAINS $q)
RETURN n.id AS id, labels(n)[0] AS label, coalesce(n.name, n.title, n.id) AS name
ORDER BY size(coalesce(n.name, n.title, n.id)) ASC
LIMIT $limit
