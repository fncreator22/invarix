UNWIND $rows AS r
MATCH (a:Exception {id: r.from}), (b:Exception {id: r.to})
MERGE (a)-[:RENEWS]->(b)
