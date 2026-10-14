MATCH (e:Exception {id: $id})-[:WAIVES]->(c:Control)
MATCH (e)-[:OWNED_BY]->(o:Person)
OPTIONAL MATCH (e)-[:APPROVED_BY]->(ap:Person)
OPTIONAL MATCH (e)-[:AFFECTS]->(s:Service)
OPTIONAL MATCH (e)-[:COMPENSATED_BY]->(cc:CompensatingControl)
OPTIONAL MATCH (e)-[:EVIDENCED_BY]->(ev:Evidence)
OPTIONAL MATCH (a:Alert)-[:INVOLVES]->(e) WHERE a.status <> 'resolved'
RETURN e AS e, {id: c.id, name: c.name} AS control, {id: o.id, name: o.name, status: o.status} AS owner,
       CASE WHEN ap IS NULL THEN null ELSE {id: ap.id, name: ap.name} END AS approver,
       collect(DISTINCT {id: s.id, name: s.name}) AS services,
       collect(DISTINCT {id: cc.id, name: cc.description}) AS ccs,
       collect(DISTINCT {id: ev.id, name: ev.source_ref}) AS evidence, collect(DISTINCT a.id) AS alert_ids
