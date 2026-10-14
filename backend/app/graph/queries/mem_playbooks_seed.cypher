UNWIND $rows AS r
MERGE (p:Playbook {id: r.id})
ON CREATE SET p.name = r.name, p.trigger_rule_id = r.trigger_rule_id, p.steps_json = r.steps_json,
              p.built_in = true, p.enabled = true
