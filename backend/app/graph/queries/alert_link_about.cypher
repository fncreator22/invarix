// params: $rows [{id, subject_id}]   label templated from a code constant
UNWIND $rows AS r
MATCH (a:Alert {id: r.id}), (s:$$LABEL$$ {id: r.subject_id})
MERGE (a)-[:ABOUT]->(s)
