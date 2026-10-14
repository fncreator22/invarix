MATCH (x:AuditEvent) WHERE x.target_id = $id
RETURN x.at AS at, x.action AS kind, x.summary AS summary, null AS ref_kind, null AS ref_id
UNION
MATCH (a:Alert)-[:INVOLVES]->(:Exception {id: $id})
RETURN a.created_at AS at, 'alert.created' AS kind, a.title AS summary, 'Alert' AS ref_kind, a.id AS ref_id
UNION
MATCH (r:Review)-[:CONCERNS]->(:Exception {id: $id})
RETURN coalesce(r.decided_at, r.opened_at) AS at, 'review.' + r.status AS kind,
       coalesce(r.decision_note, r.rationale) AS summary, 'Review' AS ref_kind, r.id AS ref_id
