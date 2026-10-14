CALL algo.betweenness({nodeLabels:['Service'], relationshipTypes:['DEPENDS_ON']}) YIELD node, score
RETURN node.id AS service_id, score
