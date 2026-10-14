// Q-R7  params: $as_of, $max_age_s, $missing_min_severity
MATCH (e:Exception {status:'active'})-[:WAIVES]->(ctl:Control)
OPTIONAL MATCH (e)-[:COMPENSATED_BY]->(cc:CompensatingControl)
WITH e, ctl, collect(cc) AS ccs
WITH e, ctl, ccs,
     [c IN ccs WHERE c.verified_ok = false OR c.last_verified_at IS NULL
                  OR c.last_verified_at < $as_of - $max_age_s | c.id] AS bad_ids
WHERE (size(ccs) = 0 AND e.severity >= $missing_min_severity) OR size(bad_ids) > 0
RETURN e.id AS exception_id, ctl.id AS control_id, e.title AS title, e.severity AS severity, bad_ids,
       CASE WHEN size(ccs) = 0 THEN 'missing' ELSE 'stale_or_failed' END AS reason
