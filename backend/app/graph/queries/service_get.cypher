MATCH (s:Service {id: $id})
OPTIONAL MATCH (t:Team)-[:OWNS]->(s)
OPTIONAL MATCH (s)-[:DEPENDS_ON]->(down:Service)
OPTIONAL MATCH (up:Service)-[:DEPENDS_ON]->(s)
OPTIONAL MATCH (cp:CustomerPath)-[:REQUIRES]->(s)
RETURN s AS s, CASE WHEN t IS NULL THEN null ELSE {id: t.id, name: t.name} END AS team,
       collect(DISTINCT {id: down.id, name: down.name}) AS depends_on,
       collect(DISTINCT {id: up.id, name: up.name}) AS depended_on_by,
       collect(DISTINCT {id: cp.id, name: cp.name}) AS customer_paths
