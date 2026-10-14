CREATE (:AuditEvent {id: $id, at: $at, actor_kind: $actor_kind, actor_id: $actor_id, action: $action,
                     target_kind: $target_kind, target_id: $target_id, summary: $summary, diff_json: $diff_json,
                     request_id: $request_id})
