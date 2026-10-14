MATCH (s:Session {user_id: $user_id}) RETURN s AS s ORDER BY s.last_active_at DESC LIMIT $limit
