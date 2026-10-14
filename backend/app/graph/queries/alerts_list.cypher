// params: $statuses, $severities, $rules, $subject_id, $involves, $skip, $limit (filters nullable)
MATCH (a:Alert)
WHERE ($statuses IS NULL OR a.status IN $statuses) AND ($severities IS NULL OR a.severity IN $severities)
  AND ($rules IS NULL OR a.rule_id IN $rules) AND ($subject_id IS NULL OR a.subject_id = $subject_id)
  AND ($involves IS NULL OR (a)-[:INVOLVES]->(:Exception {id: $involves}))
WITH a, CASE a.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END AS rank
ORDER BY rank ASC, a.score DESC, a.created_at DESC, a.id ASC
SKIP $skip LIMIT $limit
OPTIONAL MATCH (a)-[:ABOUT]->(s)
OPTIONAL MATCH (a)-[:INVOLVES]->(e:Exception)
WITH a, rank, s, collect(DISTINCT {id: e.id, name: e.title}) AS involved
RETURN a AS a, labels(s)[0] AS subject_kind, coalesce(s.name, s.title, a.subject_id) AS subject_name, involved
ORDER BY rank ASC, a.score DESC, a.created_at DESC, a.id ASC
