// Field names are fixed by the caller (services/workspaces.py); values are parameters.
MATCH (w:Workspace {id: $ws_id})
SET w.status = coalesce($status, w.status), w.clock_mode = coalesce($clock_mode, w.clock_mode),
    w.as_of = coalesce($as_of, w.as_of), w.ai_mode = coalesce($ai_mode, w.ai_mode),
    w.onboarding_step = coalesce($onboarding_step, w.onboarding_step),
    w.onboarding_done = coalesce($onboarding_done, w.onboarding_done), w.dirty = coalesce($dirty, w.dirty),
    w.last_sentinel_at = coalesce($last_sentinel_at, w.last_sentinel_at), w.name = coalesce($name, w.name),
    w.data_mode = coalesce($data_mode, w.data_mode),
    w.integrations_json = coalesce($integrations_json, w.integrations_json)
RETURN w AS w
