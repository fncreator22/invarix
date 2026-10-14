// compare-and-set lock (03 §14)  params: $ws_id, $now, $until
MATCH (w:Workspace {id: $ws_id})
WHERE coalesce(w.sentinel_lock_until, 0) < $now
SET w.sentinel_lock_until = $until
RETURN w.id AS id
