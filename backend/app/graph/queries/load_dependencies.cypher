UNWIND $rows AS r
MATCH (a:Service {id: r.from}), (b:Service {id: r.to})
MERGE (a)-[d:DEPENDS_ON]->(b)
SET d.w = 1
