UNWIND $rows AS r
MATCH (e:Exception {id: r.exception_id}), (c:CompensatingControl {id: r.cc_id})
MERGE (e)-[:COMPENSATED_BY]->(c)
