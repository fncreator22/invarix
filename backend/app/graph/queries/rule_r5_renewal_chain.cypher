// Q-R5  params: $k
MATCH (latest:Exception {status:'active'})-[:WAIVES]->(c:Control)
WHERE NOT ()-[:RENEWS]->(latest)
MATCH p = (latest)-[:RENEWS*1..10]->(root:Exception)
WHERE NOT (root)-[:RENEWS]->()
WITH latest, c, p, length(p) + 1 AS chain_length
WHERE chain_length >= $k
RETURN latest.id AS exception_id, latest.title AS title, c.id AS control_id, c.name AS control_name, chain_length,
       [n IN nodes(p) | n.id] AS chain_ids
