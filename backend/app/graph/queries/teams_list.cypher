MATCH (t:Team)
OPTIONAL MATCH (t)-[:OWNS]->(s:Service)
OPTIONAL MATCH (lead:Person)-[l:LEADS]->(t) WHERE l.since <= $as_of AND (l.until IS NULL OR l.until > $as_of)
OPTIONAL MATCH (p:Person)-[m:MEMBER_OF]->(t) WHERE m.since <= $as_of AND (m.until IS NULL OR m.until > $as_of)
RETURN t AS t, collect(DISTINCT {id: s.id, name: s.name}) AS services,
       collect(DISTINCT {id: lead.id, name: lead.name}) AS leads, count(DISTINCT p) AS members
ORDER BY t.name
