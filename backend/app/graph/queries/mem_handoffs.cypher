MATCH (h:HandoffTask) WHERE $status IS NULL OR h.status = $status
RETURN h AS h ORDER BY h.priority ASC, h.created_at DESC LIMIT $limit
