// renewal chain through $id: [id, hops] pairs in both directions (sorted in Python)
MATCH (e:Exception {id: $id})
OPTIONAL MATCH p1 = (e)-[:RENEWS*1..10]->(older:Exception)
WITH e, collect([older.id, length(p1)]) AS olders
OPTIONAL MATCH p2 = (newer:Exception)-[:RENEWS*1..10]->(e)
RETURN olders, collect([newer.id, length(p2)]) AS newers
