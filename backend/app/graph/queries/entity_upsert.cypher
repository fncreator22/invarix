// generic registry write; label from a code constant, props whitelisted in services/registry.py
MERGE (n:$$LABEL$$ {id: $id})
ON CREATE SET n.created_at = $now, n.created_by = $actor, n.source = 'manual'
SET n += $props, n.updated_at = $now
RETURN n AS n
