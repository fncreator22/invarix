// one entity's direct relationships, both directions  params: $id, $limit
MATCH (n {id: $id})-[r]-(m)
RETURN type(r) AS type, startNode(r).id = $id AS outgoing, m.id AS id, labels(m)[0] AS label,
       coalesce(m.name, m.title, m.description, m.id) AS name
LIMIT $limit
