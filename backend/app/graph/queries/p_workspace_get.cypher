MATCH (w:Workspace) WHERE w.id = $ws_id OR w.slug = $ws_id RETURN w AS w
