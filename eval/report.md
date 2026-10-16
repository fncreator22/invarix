# Eval report

Dataset: Northwind Pay sample, as of 1792195200. Result: **PASS**

| Metric | Result | Target |
| --- | --- | --- |
| Recall on planted scenarios | 5/5 | 5/5 |
| False positives on control services | 0 | 0 |
| Critical services in critical band | 2/2 | all |
| Control services in low band | 3/3 | all |
| Owner-resolution accuracy | 2/2 | 100% |
| p95 rule query latency (max) | 7.4 ms | < 200 ms |
| p95 predictive query latency (max) | 7.2 ms | < 100 ms |
| p95 full simulation forecast | 22.0 ms | < 100 ms |
| Avalanche SPOF ranking verified | PASS | PASS |
| Temporal collision clusters verified | PASS | PASS |
| Full detection run | 71 ms | < 3 s |
| Sample load | 94 ms | < 30 s |
| Alerts produced | 24 | — |

## Scenarios

- S1 Checkout Collision: detected
- S2 Ghost Owner: detected
- S3 Single Fallback: detected
- S4 Renewal Treadmill: detected
- S5 Quiet Expiry Week: detected

## p95 latency per rule query

- `rule_r1_expiring`: 2.2 ms
- `rule_r2_orphaned_owner`: 6.0 ms
- `rule_r3_shared_fallback`: 3.1 ms
- `radius_paths`: 7.4 ms
- `rule_r5_renewal_chain`: 4.2 ms
- `rule_r6_collision_team`: 3.3 ms
- `rule_r7_broken_comp_control`: 4.3 ms
- `rule_r8_customer_path`: 6.3 ms

## p95 latency per predictive query & simulation

- `pred_avalanche_reachability`: 7.2 ms
- `pred_avalanche_customer_paths`: 4.8 ms
- `pred_temporal_collisions`: 5.5 ms
- `run_prediction_simulation (30d)`: 22.0 ms

Groundedness is enforced per answer by `agents/guard.py` and covered by `backend/tests/test_conversational_grounding.py`.
