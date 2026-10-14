CALL algo.WCC({nodeLabels:['Exception','Service'], relationshipTypes:['AFFECTS','DEPENDS_ON']}) YIELD node, componentId
RETURN componentId AS component_id, collect(node.id) AS members
