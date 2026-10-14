CALL algo.pageRank('Service', 'DEPENDS_ON') YIELD node, score
RETURN node.id AS service_id, score
