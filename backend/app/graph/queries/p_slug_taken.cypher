MATCH (w:Workspace {slug: $slug}) RETURN count(w) AS n
