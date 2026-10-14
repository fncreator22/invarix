// params: $service_id (nullable)
MATCH (s:Service) WHERE $service_id IS NULL OR s.id = $service_id
OPTIONAL MATCH (t:Team)-[:OWNS]->(s)
OPTIONAL MATCH (s)<-[:AFFECTS]-(e:Exception {status: 'active'})
RETURN s.id AS id, s.name AS name, s.tier AS tier, s.customer_facing AS customer_facing, t.id AS team_id,
       t.name AS team_name, coalesce(s.risk_score, 0.0) AS score, coalesce(s.risk_band, 'low') AS band,
       coalesce(s.risk_rule_hits, []) AS rule_hits, count(DISTINCT e) AS active_exceptions, s.risk_json AS risk_json
ORDER BY score DESC, name ASC
