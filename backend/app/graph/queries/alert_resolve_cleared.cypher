// Q-ALT-RES  params: $now, $active_ids, $evaluated_rule_ids
MATCH (a:Alert)
WHERE a.status IN ['open', 'acknowledged', 'snoozed'] AND a.rule_id IN $evaluated_rule_ids AND NOT a.id IN $active_ids
SET a.status = 'resolved', a.resolved_at = $now, a.resolution = 'auto_cleared', a.version = a.version + 1
RETURN a.id AS id
