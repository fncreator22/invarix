// Q-RAD  every DEPENDS_ON*0..2 path from a service to an active exception (R4 + scoring). Shortest picked in Python.
MATCH p = (s:Service)-[:DEPENDS_ON*0..2]->(t:Service)<-[:AFFECTS]-(e:Exception {status:'active'})
RETURN s.id AS service_id, e.id AS exception_id, [n IN nodes(p) | n.id] AS path_ids
