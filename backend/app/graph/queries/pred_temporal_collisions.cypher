// Q-PRED-COL  params: $as_of, $horizon_s
MATCH (e:Exception {status: 'active'})-[:AFFECTS]->(s:Service)
WHERE e.expires_at >= $as_of AND e.expires_at <= $as_of + $horizon_s
MATCH p = (s)-[:DEPENDS_ON*0..2]->(target:Service)
RETURN e.id AS exception_id,
       e.title AS exception_title,
       e.severity AS severity,
       e.expires_at AS expires_at,
       s.id AS service_id,
       s.name AS service_name,
       s.tier AS service_tier,
       s.customer_facing AS service_customer_facing,
       target.id AS connected_service_id,
       target.name AS connected_service_name,
       target.tier AS connected_service_tier,
       length(p) AS hops,
       [n IN nodes(p) | n.id] AS path_ids
