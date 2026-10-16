# Problem Statement & Vision: Combinatorial Risk

## The Core Problem
Modern engineering teams grant temporary security waivers, cost-limit exemptions, skipped integration tests, and manual bypasses every day. Each exception is defensible and low-risk in isolation.

However, in production microservice architectures, **individually reasonable exceptions add up to unreasonable compound risk**:
1. **Service Concentration**: Multiple independent waivers accumulate on a single shared root service (e.g., payments gateway).
2. **Ghost / Orphaned Owners**: A waiver author leaves the company, and the exception remains permanently active without accountability.
3. **Expiry Collisions**: Multiple waivers expire simultaneously during peak traffic or deploy windows.
4. **Broken Compensating Controls**: A waiver relies on a secondary mitigation control that was quietly disabled or failed its last audit.

## Why Relational & Vector Databases Fail
Flat spreadsheets and relational registers cannot detect combinatorial exposure:
- Relational databases require expensive recursive multi-hop joins that fail to scale across deep dependency trees.
- Vector search retrieves semantic text similarity but cannot evaluate deterministic structural reachability (e.g., *Can service A reach customer-facing path B in 3 hops?*).

## The Solution: INVARIX
INVARIX models every exception as a **promise in a property graph** powered by **FalkorDB**:
- Traverses multi-hop dependency chains in milliseconds.
- Computes structural PageRank, betweenness centrality, and shortest proof paths.
- Provides autonomous invariant detection rules (`R1`–`R8`) and a grounded conversational agent (**Steward**).
