// Q-R1  params: $as_of, $window_s
MATCH (e:Exception {status:'active'})-[:WAIVES]->(c:Control)
WHERE e.expires_at <= $as_of + $window_s OR e.condition_met = true
RETURN e.id AS exception_id, e.title AS title, e.severity AS severity, e.expires_at AS expires_at, c.id AS control_id,
       CASE WHEN e.expires_at < $as_of THEN 'expired'
            WHEN e.condition_met = true THEN 'condition_met'
            ELSE 'expiring' END AS reason
