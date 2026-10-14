// Q-SP  params: $from_id, $to_id
MATCH (a {id: $from_id}), (b {id: $to_id})
CALL algo.SPpaths({sourceNode: a, targetNode: b,
                   relTypes: ['REQUIRES', 'DEPENDS_ON', 'AFFECTS', 'OWNS', 'OWNED_BY', 'COMPENSATED_BY', 'RELIES_ON', 'WAIVES', 'LEADS', 'MEMBER_OF', 'RENEWS'],
                   relDirection: 'both', pathCount: 1, maxLen: 6})
YIELD path
RETURN [n IN nodes(path) | n.id] AS node_ids,
       [r IN relationships(path) | [startNode(r).id, type(r), endNode(r).id]] AS edges
