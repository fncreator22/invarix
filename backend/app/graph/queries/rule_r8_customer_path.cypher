// Q-R8  every customer path reaching an active exception (depth fixed). Shortest per (path, exception) picked in Python.
MATCH p = (cp:CustomerPath)-[:REQUIRES]->(:Service)-[:DEPENDS_ON*0..3]->(:Service)<-[:AFFECTS]-(e:Exception {status:'active'})
RETURN cp.id AS path_id, cp.name AS path_name, e.id AS exception_id, e.title AS title, e.severity AS severity,
       [n IN nodes(p) | n.id] AS path_ids
