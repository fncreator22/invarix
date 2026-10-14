UNWIND $rows AS r
MATCH (p:Person {id: r.person_id}), (t:Team {id: r.team_id})
MERGE (p)-[m:MEMBER_OF {since: r.since}]->(t)
SET m.until = r.until
