// Q-PRED-CACHE-SET  params: $rows (list of {service_id, simulated_score, risk_band, is_spof, has_collision, pulse, color}), $as_of
UNWIND $rows AS row
MATCH (s:Service {id: row.service_id})
SET s.sim_score      = row.simulated_score,
    s.sim_band       = row.risk_band,
    s.sim_is_spof    = row.is_spof,
    s.sim_collision  = row.has_collision,
    s.sim_pulse      = row.pulse,
    s.sim_color      = row.color,
    s.sim_cached_at  = $as_of
