UNWIND $rows AS r
MERGE (c:RuleConfig {rule_id: r.rule_id})
ON CREATE SET c.enabled = r.enabled, c.params_json = r.params_json, c.updated_at = $now, c.updated_by = 'system'
