MATCH (p:Person {id: $id})
OPTIONAL MATCH (p)-[m:MEMBER_OF]->(t:Team)
WITH p, collect(DISTINCT {team_id: t.id, team: t.name, since: m.since, until: m.until}) AS memberships
OPTIONAL MATCH (p)-[l:LEADS]->(t2:Team)
WITH p, memberships, collect(DISTINCT {team_id: t2.id, team: t2.name, since: l.since, until: l.until}) AS leads
OPTIONAL MATCH (e:Exception)-[:OWNED_BY]->(p)
WITH p, memberships, leads, collect(DISTINCT {id: e.id, name: e.title, status: e.status}) AS owned
OPTIONAL MATCH (cc:CompensatingControl)-[:RELIES_ON]->(p)
RETURN p AS p, memberships, leads, owned, collect(DISTINCT {id: cc.id, name: cc.description}) AS relied_on_by
