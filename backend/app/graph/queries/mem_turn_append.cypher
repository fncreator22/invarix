// params: $session_id, $user_id, $turns [{id, idx, role, content, tool_calls_json, citations_json, model, tokens_in, tokens_out, refs}], $now
MATCH (s:Session {id: $session_id, user_id: $user_id})
SET s.last_active_at = $now, s.title = coalesce(s.title, $title)
WITH s
UNWIND $turns AS x
CREATE (s)-[:HAS_TURN]->(t:Turn {id: x.id, session_id: $session_id, idx: x.idx, role: x.role, content: x.content,
                                 tool_calls_json: x.tool_calls_json, citations_json: x.citations_json, model: x.model,
                                 tokens_in: x.tokens_in, tokens_out: x.tokens_out, created_at: $now})
WITH t, x
UNWIND x.refs AS r
MERGE (ref:Ref {key: r.key}) ON CREATE SET ref.kind = r.kind, ref.ref_id = r.id
MERGE (t)-[:MENTIONED]->(ref)
