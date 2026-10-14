// close open handoffs for the given alerts  params: $alert_ids, $now, $result
MATCH (h:HandoffTask) WHERE h.payload_id IN $alert_ids AND h.status IN ['open', 'claimed']
SET h.status = 'done', h.done_at = $now, h.result_json = $result
RETURN count(h) AS n
