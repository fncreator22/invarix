// Q-R6T  params: $as_of, $horizon_s, $window_s, $k   (engine keeps the largest window per team)
MATCH (t:Team)-[:OWNS]->(s:Service)<-[:AFFECTS]-(e:Exception {status:'active'})
WHERE e.expires_at >= $as_of AND e.expires_at <= $as_of + $horizon_s
WITH t, collect(DISTINCT e) AS es, collect(DISTINCT [e.id, s.id]) AS pairs
UNWIND es AS anchor
WITH t, es, pairs, anchor,
     [x IN es WHERE x.expires_at >= anchor.expires_at AND x.expires_at <= anchor.expires_at + $window_s | x.id] AS in_window
WHERE size(in_window) >= $k
RETURN t.id AS team_id, t.name AS team_name, anchor.id AS anchor_id, anchor.expires_at AS window_start,
       in_window AS exception_ids, size(in_window) AS n, pairs
ORDER BY n DESC, window_start ASC
