MATCH (r:Review {id: $id})-[:ABOUT]->(a:Alert), (r)-[:CONCERNS]->(e:Exception)-[:WAIVES]->(c:Control)
OPTIONAL MATCH (e)-[:AFFECTS]->(s:Service)
RETURN r AS r, {id: a.id, name: a.title} AS alert, {id: e.id, name: e.title} AS exception, c.id AS control_id,
       collect(DISTINCT s.id) AS service_ids
