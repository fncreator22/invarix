UNWIND $rows AS r
MATCH (p:Person {id: r.person_id}), (t:Team {id: r.team_id})
MERGE (p)-[l:LEADS {since: r.since}]->(t)
SET l.until = r.until
