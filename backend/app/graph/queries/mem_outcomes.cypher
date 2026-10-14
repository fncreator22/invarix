MATCH (o:ReviewOutcome)
RETURN o.id AS id, o.review_id AS review_id, o.decision AS decision, o.note AS note, o.decided_by AS decided_by,
       o.decided_at AS decided_at, o.exception_id AS exception_id, o.control_id AS control_id
ORDER BY o.decided_at DESC
LIMIT $limit
