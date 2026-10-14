// params: $as_of, $person_id
MATCH (a:Alert) WHERE a.status IN ['open', 'acknowledged', 'snoozed']
RETURN 'alert' AS kind, a.severity AS key, count(a) AS n
UNION
MATCH (e:Exception {status: 'active'})
RETURN 'active' AS kind, CASE WHEN e.expires_at <= $as_of + 604800 THEN 'expiring_7d' ELSE 'later' END AS key, count(e) AS n
UNION
MATCH (r:Review {status: 'pending'})-[:ASSIGNED_TO]->(p:Person {id: $person_id})
RETURN 'my_reviews' AS kind, 'pending' AS key, count(DISTINCT r) AS n
