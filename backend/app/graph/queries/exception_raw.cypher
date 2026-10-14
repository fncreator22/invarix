// everything needed to copy an exception into a renewal successor
MATCH (e:Exception {id: $id})-[:WAIVES]->(c:Control), (e)-[:OWNED_BY]->(o:Person)
OPTIONAL MATCH (e)-[:APPROVED_BY]->(a:Person)
OPTIONAL MATCH (e)-[:AFFECTS]->(s:Service)
OPTIONAL MATCH (e)-[:COMPENSATED_BY]->(cc:CompensatingControl)
OPTIONAL MATCH (e)-[:RENEWS*1..10]->(older:Exception)
RETURN e AS e, c.id AS control_id, o.id AS owner_id, a.id AS approver_id, collect(DISTINCT s.id) AS service_ids,
       collect(DISTINCT cc.id) AS cc_ids, count(DISTINCT older) AS renewal_depth
