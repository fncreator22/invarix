MATCH (e:Exception {id: $id})
WHERE ($from_status IS NULL OR e.status = $from_status) AND ($version IS NULL OR e.version = $version)
SET e.status = $status, e.version = e.version + 1, e.updated_at = $now,
    e.closed_at = CASE WHEN $status = 'closed' THEN $now ELSE e.closed_at END,
    e.closed_reason = CASE WHEN $status = 'closed' THEN $reason ELSE e.closed_reason END,
    e.revoked_at = CASE WHEN $status = 'revoked' THEN $now ELSE e.revoked_at END
RETURN e.id AS id, e.version AS version
