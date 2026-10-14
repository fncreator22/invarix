MATCH (w:Workspace {id: $ws_id}) SET w.sentinel_lock_until = 0, w.dirty = false, w.last_sentinel_at = $now
