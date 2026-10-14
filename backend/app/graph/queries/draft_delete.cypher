MATCH (e:Exception {id: $id, status: 'draft'})
OPTIONAL MATCH (e)-[:EVIDENCED_BY]->(ev:Evidence)
DETACH DELETE e, ev
RETURN count(e) AS n
