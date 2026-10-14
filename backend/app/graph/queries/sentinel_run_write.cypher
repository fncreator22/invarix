CREATE (:SentinelRun {id: $id, trigger: $trigger, as_of: $as_of, started_at: $started_at, finished_at: $finished_at,
                      rules_run: $rules_run, alerts_created: $alerts_created, alerts_updated: $alerts_updated,
                      alerts_resolved: $alerts_resolved, duration_ms: $duration_ms, error: $error})
