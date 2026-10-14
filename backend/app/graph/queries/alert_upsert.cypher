// Q-ALT-UP (batched, F3/F15: merge on deterministic id)  params: $rows, $now, $as_of
UNWIND $rows AS r
MERGE (a:Alert {id: r.id})
ON CREATE SET a.fingerprint = r.fingerprint, a.rule_id = r.rule_id, a.status = 'open', a.created_at = $now,
              a.first_as_of = $as_of, a.version = 1, a.subject_kind = r.subject_kind, a.subject_id = r.subject_id
ON MATCH SET a.version = a.version + 1,
             a.resolved_at = CASE WHEN a.status = 'resolved' THEN null ELSE a.resolved_at END,
             a.status = CASE WHEN a.status = 'resolved' THEN 'open'
                             WHEN a.status = 'snoozed' AND a.snoozed_until <= $as_of THEN 'open'
                             ELSE a.status END
SET a.severity = r.severity, a.score = r.score, a.title = r.title, a.summary = r.summary,
    a.reason_code = r.reason_code, a.proof_json = r.proof_json, a.score_json = r.score_json,
    a.last_seen_at = $now, a.last_as_of = $as_of
RETURN a.id AS id, a.version = 1 AS created, a.status AS status, a.severity AS severity, a.title AS title
