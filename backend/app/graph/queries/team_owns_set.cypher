MATCH (s:Service {id: $service_id})
OPTIONAL MATCH (:Team)-[old:OWNS]->(s)
DELETE old
WITH DISTINCT s
MATCH (t:Team {id: $team_id})
MERGE (t)-[:OWNS]->(s)
