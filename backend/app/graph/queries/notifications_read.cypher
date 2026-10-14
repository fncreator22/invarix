MATCH (n:Notification {recipient_user_id: $user_id})
WHERE n.read_at IS NULL AND ($id IS NULL OR n.id = $id)
SET n.read_at = $now
RETURN count(n) AS n
