MATCH (:Service {id: $from_id})-[d:DEPENDS_ON]->(:Service {id: $to_id}) DELETE d
