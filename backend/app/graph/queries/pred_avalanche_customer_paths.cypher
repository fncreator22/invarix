// Q-PRED-CP  params: $service_id (nullable)
MATCH (target:Service)
WHERE $service_id IS NULL OR target.id = $service_id
MATCH p = (cp:CustomerPath)-[:REQUIRES]->(:Service)-[:DEPENDS_ON*0..4]->(target)
RETURN target.id AS target_id,
       cp.id AS customer_path_id,
       cp.name AS customer_path_name,
       length(p) AS hops,
       [n IN nodes(p) | n.id] AS path_ids
