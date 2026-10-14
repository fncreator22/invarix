// Scoring inputs for every active exception
MATCH (e:Exception {status:'active'})-[:WAIVES]->(c:Control)
RETURN e.id AS id, e.title AS title, e.severity AS severity, e.granted_at AS granted_at, e.expires_at AS expires_at,
       c.id AS control_id, coalesce(c.severity_weight, 3) AS control_weight
