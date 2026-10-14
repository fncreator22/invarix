// current score cached on the service for fast reads  params: $rows [{id, score, band, rule_hits, score_json}], $as_of
UNWIND $rows AS r
MATCH (s:Service {id: r.id})
SET s.risk_score = r.score, s.risk_band = r.band, s.risk_rule_hits = r.rule_hits, s.risk_json = r.score_json,
    s.risk_as_of = $as_of
