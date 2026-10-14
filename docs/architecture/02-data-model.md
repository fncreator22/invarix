# Graph Data Model & Tri-Planar Architecture

## Tri-Planar FalkorDB Graph Topology

To guarantee tenant isolation and clean separation of concerns, each workspace utilizes three distinct graphs:

| Graph | Graph Identifier | Purpose |
| :--- | :--- | :--- |
| **Platform Graph** | `platform_<prefix>` | Global users, workspaces, memberships, and API keys. |
| **Domain Graph** | `org_<workspace_id>` | Services, people, teams, exceptions, controls, and customer paths. |
| **Memory Graph** | `mem_<workspace_id>` | Agent episodic memory (Turns), semantic memory (Facts), playbooks, and handoffs. |

---

## Domain Graph Entity Schema (`org_<ws_id>`)

### Node Labels
* `Service`: Microservice or system (`id`, `name`, `tier`, `customer_facing`, `description`, `risk_score`).
* `Exception`: Temporary waiver or bypass (`id`, `title`, `severity`, `status`, `expires_at`, `created_at`).
* `Person`: Team member or engineer (`id`, `name`, `email`, `title`, `role`, `status`).
* `Team`: Functional organization unit (`id`, `name`).
* `Control`: Policy requirement or standard (`id`, `name`, `framework`, `severity_weight`).
* `CompensatingControl`: Fallback mitigation (`id`, `description`, `last_verified_at`, `verified_ok`).
* `CustomerPath`: High-impact customer journey (`id`, `name`, `description`).
* `Alert`: Detected risk violation (`id`, `rule_id`, `severity`, `title`, `status`, `created_at`).

### Relationship Edges
* `(:Exception)-[:AFFECTS]->(:Service)`
* `(:Exception)-[:WAIVES]->(:Control)`
* `(:Exception)-[:OWNED_BY]->(:Person)`
* `(:Exception)-[:RELIES_ON]->(:CompensatingControl)`
* `(:Service)-[:DEPENDS_ON]->(:Service)`
* `(:Service)-[:OWNED_BY]->(:Team)`
* `(:Person)-[:MEMBER_OF]->(:Team)`
* `(:CustomerPath)-[:REQUIRES]->(:Service)`
* `(:Alert)-[:ABOUT]->(:Service | :Exception | :CustomerPath)`
