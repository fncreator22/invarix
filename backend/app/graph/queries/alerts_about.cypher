// open alerts whose subject is $id, or that involve exception $id
MATCH (a:Alert) WHERE a.status <> 'resolved' AND (a.subject_id = $id OR (a)-[:INVOLVES]->(:Exception {id: $id}))
RETURN a.id AS id, a.rule_id AS rule_id, a.severity AS severity, a.title AS title
