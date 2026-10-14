MATCH (a)-[r]->(b) WHERE a.id IN $ids AND b.id IN $ids
RETURN a.id AS from, type(r) AS type, b.id AS to
