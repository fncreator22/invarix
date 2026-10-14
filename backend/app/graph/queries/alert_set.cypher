// Field set chosen by the caller; values are parameters. Optional version check.
MATCH (a:Alert {id: $id})
WHERE $version IS NULL OR a.version = $version
SET a.status = coalesce($status, a.status), a.ack_by = coalesce($ack_by, a.ack_by), a.ack_at = coalesce($ack_at, a.ack_at),
    a.snoozed_until = CASE WHEN $status = 'snoozed' THEN $snoozed_until ELSE a.snoozed_until END,
    a.snooze_reason = coalesce($snooze_reason, a.snooze_reason),
    a.resolved_at = CASE WHEN $status = 'resolved' THEN $now ELSE a.resolved_at END,
    a.resolution = coalesce($resolution, a.resolution), a.resolution_note = coalesce($resolution_note, a.resolution_note),
    a.feedback = coalesce($feedback, a.feedback), a.feedback_note = coalesce($feedback_note, a.feedback_note),
    a.version = a.version + 1
RETURN a.id AS id, a.version AS version
