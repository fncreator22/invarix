// dirty workspaces, and live workspaces stale for 60+ min  params: $stale_before
MATCH (w:Workspace {status: 'ready'})
WHERE w.dirty = true OR (w.clock_mode = 'live' AND coalesce(w.last_sentinel_at, 0) < $stale_before)
RETURN w.id AS id
