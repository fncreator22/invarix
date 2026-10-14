MATCH (a:Alert {id: $id}) SET a.llm_summary = $summary, a.llm_summary_version = $version
