MATCH (n:Notification {recipient_user_id: $user_id})
RETURN n AS n ORDER BY n.created_at DESC LIMIT $limit
