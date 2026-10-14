// Degree-centrality fallback inputs
MATCH (s:Service)
OPTIONAL MATCH (s)<-[i:DEPENDS_ON]-()
WITH s, count(i) AS in_deg
OPTIONAL MATCH (s)-[o:DEPENDS_ON]-()
RETURN s.id AS service_id, in_deg, count(o) AS deg
