// Q-PRED-AVA  params: $service_id (nullable)
MATCH (target:Service)
WHERE $service_id IS NULL OR target.id = $service_id
OPTIONAL MATCH p = (dependent:Service)-[:DEPENDS_ON*1..4]->(target)
RETURN target.id AS target_id,
       target.name AS target_name,
       target.tier AS target_tier,
       target.customer_facing AS target_customer_facing,
       dependent.id AS dependent_id,
       dependent.name AS dependent_name,
       dependent.tier AS tier,
       dependent.customer_facing AS customer_facing,
       length(p) AS hops,
       [n IN nodes(p) | n.id] AS path_ids
