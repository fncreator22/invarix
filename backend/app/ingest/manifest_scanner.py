"""Repository & Infrastructure Manifest Ingestion Engine powered by NVIDIA Nemotron-3.5-Lightning.

Exploits Nemotron's 1M context window to ingest entire monorepos, Kubernetes manifests,
Helm charts, and docker-compose files in a single prompt to map the topology graph into FalkorDB.
"""

import re
from typing import Any, Literal
import yaml
from pydantic import BaseModel, Field

from app.agents import llm
from app.graph.repo import Repo
from app.ids import new_id, now

# Support up to 1,000,000 context characters/tokens for Nemotron-3.5-Lightning
MAX_MANIFEST_TEXT = 1_000_000

MANIFEST_INGEST_SYSTEM = (
    "You are the INVARIX Architecture Ingestion Engine powered by NVIDIA Nemotron-3.5-Lightning. "
    "You ingest raw multi-file infrastructure manifests (Kubernetes manifests, Helm templates, "
    "Docker Compose files, or microservice architecture descriptors) and reconstruct the complete "
    "service topology, inter-service dependency graph, and any temporary waivers/bypasses. "
    "Return clean, structured JSON matching the provided schema."
)


class IngestedService(BaseModel):
    id: str = Field(..., description="Unique service ID slug, e.g. svc_payments_gateway")
    label: str = Field(..., description="Human-readable service name")
    tier: int = Field(1, ge=1, le=4, description="Service criticality tier (1=Ingress/Checkout, 4=Leaf)")
    customer_facing: bool = False
    team_hint: str | None = None


class IngestedDependency(BaseModel):
    from_service_id: str
    to_service_id: str
    kind: Literal["sync", "async", "event", "database"] = "sync"
    critical: bool = True


class IngestedWaiver(BaseModel):
    title: str
    service_id: str
    kind: Literal["security_waiver", "flag_override", "skipped_test", "emergency_change"]
    severity: int = Field(3, ge=1, le=5)
    description: str | None = None


class TopologyIngestResult(BaseModel):
    services: list[IngestedService] = []
    dependencies: list[IngestedDependency] = []
    waivers: list[IngestedWaiver] = []
    summary: str = ""
    warnings: list[str] = []


def _deterministic_manifest_parse(raw_text: str) -> TopologyIngestResult:
    """Fallback deterministic manifest parser for offline CI/CD or unconfigured environments."""
    services: dict[str, IngestedService] = {}
    dependencies: list[IngestedDependency] = []
    waivers: list[IngestedWaiver] = []

    # Parse YAML documents
    docs = []
    for chunk in re.split(r"^---", raw_text, flags=re.MULTILINE):
        chunk = chunk.strip()
        if not chunk:
            continue
        try:
            parsed = yaml.safe_load(chunk)
            if isinstance(parsed, dict):
                docs.append(parsed)
        except Exception:
            pass

    for doc in docs:
        kind = doc.get("kind", "").lower()
        meta = doc.get("metadata", {})
        name = meta.get("name")
        if not name:
            continue

        svc_id = f"svc_{name.lower().replace('-', '_')}"
        if kind in ("deployment", "statefulset", "daemonset", "service"):
            is_cf = "ingress" in name.lower() or "gateway" in name.lower() or "api" in name.lower()
            tier = 1 if is_cf else 2
            services[svc_id] = IngestedService(
                id=svc_id,
                label=name,
                tier=tier,
                customer_facing=is_cf,
                team_hint=meta.get("labels", {}).get("team"),
            )

            # Check annotations for bypasses/waivers
            annotations = meta.get("annotations", {})
            for k, v in annotations.items():
                if any(bypass in k.lower() for bypass in ("skip", "waiver", "override", "insecure", "allow")):
                    waivers.append(
                        IngestedWaiver(
                            title=f"Manifest annotation waiver: {k}",
                            service_id=svc_id,
                            kind="security_waiver" if "sec" in k.lower() or "tls" in k.lower() else "flag_override",
                            severity=4 if "tls" in k.lower() or "auth" in k.lower() else 3,
                            description=str(v),
                        )
                    )

    # Detect inter-service call patterns in text (e.g. http://svc-name, depends_on)
    for s_id in list(services.keys()):
        base_name = s_id.removeprefix("svc_").replace("_", "-")
        calls = re.findall(rf"https?://([a-z0-9_-]+)(?:\.[a-z0-9_-]+)*", raw_text, flags=re.IGNORECASE)
        for target in set(calls):
            target_id = f"svc_{target.lower().replace('-', '_')}"
            if target_id in services and target_id != s_id:
                dependencies.append(
                    IngestedDependency(from_service_id=s_id, to_service_id=target_id, kind="sync")
                )

    return TopologyIngestResult(
        services=list(services.values()),
        dependencies=dependencies,
        waivers=waivers,
        summary=f"Ingested {len(services)} services and {len(dependencies)} dependency edges via manifest parser.",
    )


async def ingest_repository_manifests(
    ws_id: str,
    ai_mode: str,
    raw_manifest_text: str,
    org_repo: Repo | None = None,
) -> TopologyIngestResult:
    """Ingest multi-file monorepo manifests utilizing NVIDIA Nemotron-3.5-Lightning."""
    clipped = raw_manifest_text[:MAX_MANIFEST_TEXT]
    try:
        raw_json = await llm.complete_json(
            ws_id=ws_id,
            ai_mode=ai_mode,
            messages=[
                {"role": "system", "content": MANIFEST_INGEST_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        "Analyze the following monorepo infrastructure manifests and emit the complete "
                        "service topology, dependencies, and any technical debt waivers:\n\n"
                        f"<manifests>\n{clipped}\n</manifests>"
                    ),
                },
            ],
            schema=TopologyIngestResult.model_json_schema(),
            name="topology_ingest",
            role="ingest",  # Routes to Nemotron-3.5-Lightning (1M context)
        )
        result = TopologyIngestResult.model_validate(raw_json)
    except Exception:
        result = _deterministic_manifest_parse(clipped)

    # If repo connection provided, write directly to FalkorDB
    if org_repo:
        current_ts = now()
        for svc in result.services:
            await org_repo.write(
                "service_upsert",
                id=svc.id,
                label=svc.label,
                tier=svc.tier,
                customer_facing=svc.customer_facing,
                team_id="team_platform",
                now=current_ts,
            )
        for dep in result.dependencies:
            await org_repo.write(
                "dependency_upsert",
                from_id=dep.from_service_id,
                to_id=dep.to_service_id,
                kind=dep.kind,
                critical=dep.critical,
                now=current_ts,
            )

    return result
