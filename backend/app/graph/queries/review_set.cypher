MATCH (r:Review {id: $id})
WHERE r.status IN $from_statuses AND ($version IS NULL OR r.version = $version)
SET r.status = $status, r.version = r.version + 1,
    r.decision = coalesce($decision, r.decision), r.decision_note = coalesce($note, r.decision_note),
    r.decided_at = CASE WHEN $status = 'decided' THEN $now ELSE r.decided_at END,
    r.decided_by = CASE WHEN $status = 'decided' THEN $user_id ELSE r.decided_by END
RETURN r.id AS id, r.version AS version
