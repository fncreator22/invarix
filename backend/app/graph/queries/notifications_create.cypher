UNWIND $rows AS r
CREATE (:Notification {id: r.id, recipient_user_id: r.recipient_user_id, kind: r.kind, ref_kind: r.ref_kind,
                       ref_id: r.ref_id, title: r.title, body: r.body, created_at: $now})
