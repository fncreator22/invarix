CREATE (s:Session {id: $id, user_id: $user_id, title: $title, started_at: $now, last_active_at: $now,
                   as_of_at_start: $as_of})
RETURN s AS s
