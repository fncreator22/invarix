// Q-HYD  params: $ids
MATCH (n) WHERE n.id IN $ids
RETURN n.id AS id, labels(n)[0] AS label, coalesce(n.name, n.title, n.description, n.id) AS name
