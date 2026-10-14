import pytest

from app.graph.client import graph_names
from app.graph.schema import ORG, ensure_schema


def test_graph_names_validated():
    n = graph_names("ws_01jabcdefghjkmnpqrstvwxyz0")
    assert n.org.endswith("org_01jabcdefghjkmnpqrstvwxyz0") and n.mem.endswith("mem_01jabcdefghjkmnpqrstvwxyz0")
    for bad in ["ws_ABC1234567", "ws_short", "org_x", "ws_abc1234567;DROP", "ws_abc1234567 x"]:
        with pytest.raises(ValueError):
            graph_names(bad)


async def test_ensure_schema_idempotent_and_enforced(repo):
    await ensure_schema(repo, ORG)
    await ensure_schema(repo, ORG)
    await repo.g.query("CREATE (:Person {id:'per_a', name:'A'})")
    with pytest.raises(Exception, match="unique"):
        await repo.g.query("CREATE (:Person {id:'per_a', name:'B'})")
    with pytest.raises(Exception, match="mandatory"):
        await repo.g.query("CREATE (:Service {name:'no id'})")
    await repo.g.query("CREATE (:RuleConfig {rule_id:'R1', enabled:true, params_json:'{}'})")  # F1: no id needed
