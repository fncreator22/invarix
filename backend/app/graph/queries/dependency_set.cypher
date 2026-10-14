MATCH (a:Service {id: $from_id}), (b:Service {id: $to_id})
MERGE (a)-[d:DEPENDS_ON]->(b) SET d.w = 1
