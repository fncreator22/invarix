MATCH (e:Exception {status: 'draft', source: 'ingest'})
OPTIONAL MATCH (e)-[:WAIVES]->(c:Control)
OPTIONAL MATCH (e)-[:OWNED_BY]->(o:Person)
OPTIONAL MATCH (e)-[:AFFECTS]->(s:Service)
RETURN e AS e, CASE WHEN c IS NULL THEN null ELSE {id: c.id, name: c.name} END AS control,
       CASE WHEN o IS NULL THEN null ELSE {id: o.id, name: o.name} END AS owner,
       collect(DISTINCT {id: s.id, name: s.name}) AS services
ORDER BY e.created_at DESC
