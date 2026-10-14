// Sentinel → Steward handoffs for new high/critical alerts (T-047). Idempotent per alert.
UNWIND $rows AS r
MERGE (h:HandoffTask {id: r.id})
ON CREATE SET h.from_agent = 'sentinel', h.to_agent = 'steward', h.kind = r.kind, h.status = 'open',
              h.priority = r.priority, h.payload_kind = 'Alert', h.payload_id = r.alert_id, h.created_at = $now,
              h.title = r.title
MERGE (ref:Ref {key: 'Alert:' + r.alert_id}) ON CREATE SET ref.kind = 'Alert', ref.ref_id = r.alert_id
MERGE (h)-[:PAYLOAD]->(ref)
