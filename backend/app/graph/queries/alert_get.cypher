MATCH (a:Alert {id: $id})
OPTIONAL MATCH (a)-[:ABOUT]->(s)
OPTIONAL MATCH (a)-[:INVOLVES]->(e:Exception)
WITH a, s, collect(DISTINCT {id: e.id, name: e.title}) AS involved
RETURN a AS a, labels(s)[0] AS subject_kind, coalesce(s.name, s.title, a.subject_id) AS subject_name, involved
