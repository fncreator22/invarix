// small lookup tables for the resolver
MATCH (n) WHERE labels(n)[0] IN ['Person', 'Service', 'Control']
RETURN labels(n)[0] AS label, n.id AS id, coalesce(n.name, n.id) AS name, n.email AS email, n.status AS status,
       n.description AS description
