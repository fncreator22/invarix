MATCH (c:Control)
OPTIONAL MATCH (e:Exception {status: 'active'})-[:WAIVES]->(c)
RETURN c AS c, count(e) AS active_waivers
ORDER BY c.name
