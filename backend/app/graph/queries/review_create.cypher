// params: $id, $status, $alert_id, $exception_id, $reason_code, $rationale, $assignees_json, $assignees [{person_id, rank, reason_code}], $now
MATCH (a:Alert {id: $alert_id}), (e:Exception {id: $exception_id})
MERGE (r:Review {id: $id})
ON CREATE SET r.status = $status, r.opened_at = $now, r.reason_code = $reason_code, r.rationale = $rationale,
              r.assignees_json = $assignees_json, r.version = 1, r.alert_id = $alert_id, r.exception_id = $exception_id
MERGE (r)-[:ABOUT]->(a)
MERGE (r)-[:CONCERNS]->(e)
WITH r
UNWIND $assignees AS x
MATCH (p:Person {id: x.person_id})
MERGE (r)-[s:ASSIGNED_TO]->(p)
ON CREATE SET s.assigned_at = $now, s.rank = x.rank, s.reason_code = x.reason_code
RETURN DISTINCT r.id AS id
