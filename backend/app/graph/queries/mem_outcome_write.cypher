// ReviewOutcome is append-only (I8). Idempotent per review via MERGE on id.
MERGE (o:ReviewOutcome {id: $id})
ON CREATE SET o.review_id = $review_id, o.decision = $decision, o.note = $note, o.decided_by = $decided_by,
              o.decided_at = $decided_at, o.exception_id = $exception_id, o.control_id = $control_id,
              o.service_ids = $service_ids, o.renewal_depth = $renewal_depth
MERGE (re:Ref {key: 'Exception:' + $exception_id}) ON CREATE SET re.kind = 'Exception', re.ref_id = $exception_id
MERGE (rc:Ref {key: 'Control:' + $control_id}) ON CREATE SET rc.kind = 'Control', rc.ref_id = $control_id
MERGE (o)-[:ON_EXCEPTION]->(re)
MERGE (o)-[:ON_CONTROL]->(rc)
WITH o
UNWIND $service_ids AS sid
MERGE (rs:Ref {key: 'Service:' + sid}) ON CREATE SET rs.kind = 'Service', rs.ref_id = sid
MERGE (o)-[:ON_SERVICE]->(rs)
