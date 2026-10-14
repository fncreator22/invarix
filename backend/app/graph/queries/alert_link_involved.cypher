// params: $rows [{id, exception_ids}]
UNWIND $rows AS r
MATCH (a:Alert {id: r.id})
OPTIONAL MATCH (a)-[old:INVOLVES]->(x:Exception) WHERE NOT x.id IN r.exception_ids
DELETE old
WITH DISTINCT a, r
UNWIND r.exception_ids AS eid
MATCH (e:Exception {id: eid})
MERGE (a)-[:INVOLVES]->(e)
