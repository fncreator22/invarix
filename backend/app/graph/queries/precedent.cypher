// Q-PRE (memory graph)  params: $control_key, $service_key, $limit   (F2)
MATCH (o:ReviewOutcome)-[:ON_CONTROL]->(:Ref {key: $control_key})
OPTIONAL MATCH (o)-[:ON_SERVICE]->(r:Ref {key: $service_key})
WITH o, count(r) > 0 AS same_service
RETURN o.id AS id, o.decision AS decision, o.note AS note, o.decided_at AS decided_at,
       o.exception_id AS exception_id, o.renewal_depth AS renewal_depth, same_service
ORDER BY same_service DESC, decided_at DESC
LIMIT $limit
