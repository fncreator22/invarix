UNWIND $rows AS r
MATCH (s:Service {id: r.service_id})
CREATE (s)-[:HAS_SNAPSHOT]->(:RiskSnapshot {id: r.id, service_id: r.service_id, as_of: $as_of, score: r.score,
                                            band: r.band, raw: r.raw, breakdown_json: r.breakdown_json})
