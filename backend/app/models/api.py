"""API contracts (03 §11). The frontend mirrors these in frontend/lib/types.ts."""

from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class Role(StrEnum):
    owner = "owner"
    admin = "admin"
    reviewer = "reviewer"
    member = "member"
    viewer = "viewer"


ROLE_RANK = {Role.viewer: 0, Role.member: 1, Role.reviewer: 2, Role.admin: 3, Role.owner: 4}


class ExceptionKind(StrEnum):
    security_waiver = "security_waiver"
    flag_override = "flag_override"
    skipped_test = "skipped_test"
    cost_limit_extension = "cost_limit_extension"
    data_export_permission = "data_export_permission"
    emergency_change = "emergency_change"


class ExceptionStatus(StrEnum):
    draft = "draft"
    active = "active"
    renewed = "renewed"
    revoked = "revoked"
    closed = "closed"


class EffectiveStatus(StrEnum):
    draft = "draft"
    active = "active"
    expiring = "expiring"
    expired = "expired"
    renewed = "renewed"
    revoked = "revoked"
    closed = "closed"


class Severity(StrEnum):
    low = "low"
    moderate = "moderate"
    high = "high"
    critical = "critical"


class AlertStatus(StrEnum):
    open = "open"
    acknowledged = "acknowledged"
    snoozed = "snoozed"
    resolved = "resolved"


class Decision(StrEnum):
    renew = "renew"
    revoke = "revoke"
    close = "close"
    reassign = "reassign"
    defer = "defer"


class Base(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, populate_by_name=True)


class Page[T](Base):
    items: list[T]
    next_cursor: str | None = None


class Ref(Base):
    kind: str
    id: str
    label: str | None = None


# ---------------------------------------------------------------- account / workspaces
class Membership(Base):
    workspace_id: str
    slug: str
    name: str
    role: Role
    person_id: str | None = None
    status: Literal["provisioning", "ready", "failed", "deleting"]


class UserOut(Base):
    id: str
    email: str
    name: str | None = None
    prefs: dict[str, Any] = {}


class MeOut(Base):
    user: UserOut
    memberships: list[Membership]


class MePatch(Base):
    name: str | None = Field(default=None, max_length=120)
    prefs: dict[str, Any] | None = None


SLUG = Annotated[str, Field(pattern=r"^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$")]


class WorkspaceCreate(Base):
    name: Annotated[str, Field(min_length=2, max_length=80)]
    slug: SLUG
    data_mode: Literal["sample", "blank"]


class WorkspacePatch(Base):
    name: Annotated[str, Field(min_length=2, max_length=80)] | None = None


class WorkspaceOut(Base):
    id: str
    slug: str
    name: str
    status: Literal["provisioning", "ready", "failed", "deleting"]
    data_mode: Literal["sample", "blank", "import"]
    clock_mode: Literal["live", "simulated"]
    as_of: int
    ai_mode: Literal["cloud", "private", "off"]
    onboarding_step: str
    onboarding_done: bool
    role: Role
    person_id: str | None = None
    last_sentinel_at: int | None = None


class OnboardingPatch(Base):
    step: Literal["identity", "rules", "invite", "ready", "done"]


class LinkPerson(Base):
    person_id: str | None


class ClockIn(Base):
    as_of: int


class ClockOut(Base):
    clock_mode: Literal["live", "simulated"]
    as_of: int


class AiSettings(Base):
    ai_mode: Literal["cloud", "private", "off"]


# ---------------------------------------------------------------- graph / proof
class ProofNode(Base):
    id: str
    label: str
    name: str


class ProofEdge(Base):
    from_: str = Field(alias="from")
    to: str
    type: str


class ProofPath(Base):
    summary: str
    nodes: list[ProofNode]
    edges: list[ProofEdge]


class GraphNode(Base):
    id: str
    label: str
    name: str
    severity: int | None = None
    status: str | None = None
    score: float | None = None


class GraphOut(Base):
    nodes: list[GraphNode]
    edges: list[ProofEdge]
    truncated: bool
    total: int


# ---------------------------------------------------------------- risk / alerts
class ScoreContribution(Base):
    exception_id: str
    hops: int
    base: float
    age_factor: float
    overdue: float
    centrality: float
    value: float


class ScoreBreakdown(Base):
    service_id: str
    raw: float
    multiplier: float
    score: float
    band: Severity
    contributions: list[ScoreContribution]
    rule_hits: list[str]
    config_version: int
    as_of: int


class ServiceRisk(Base):
    service: Ref
    tier: int
    customer_facing: bool
    team: Ref | None
    score: float
    band: Severity
    rule_hits: list[str]
    active_exceptions: int


class ServiceRiskDetail(ServiceRisk):
    breakdown: ScoreBreakdown
    proof: ProofPath | None
    alert_ids: list[str]
    names: dict[str, str] = {}


class RiskSummary(Base):
    as_of: int
    open_alerts: dict[str, int]
    active_exceptions: int
    expiring_7d: int
    my_reviews: int


class RunwayItem(Base):
    team: Ref
    exception: Ref
    expires_at: int
    severity: int


class TrendPoint(Base):
    as_of: int
    score: float
    band: Severity


class AlertOut(Base):
    id: str
    rule_id: Literal["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]
    severity: Severity
    status: AlertStatus
    title: str
    summary: str | None
    score: float | None
    subject: Ref
    involved: list[Ref]
    proof: ProofPath
    breakdown: ScoreBreakdown | None
    created_at: int
    last_seen_at: int | None
    snoozed_until: int | None
    feedback: Literal["useful", "not_useful"] | None = None
    version: int


class SnoozeIn(Base):
    until: int
    reason: Annotated[str, Field(min_length=3, max_length=500)]


class ResolveIn(Base):
    note: Annotated[str, Field(min_length=3, max_length=2000)]


class FeedbackIn(Base):
    useful: bool
    note: str | None = Field(default=None, max_length=500)


# ---------------------------------------------------------------- exceptions
class EvidenceIn(Base):
    kind: Literal["ticket", "chat", "doc", "email", "other"]
    source_ref: Annotated[str, Field(min_length=1, max_length=300)]
    excerpt: str | None = Field(default=None, max_length=500)


class ExceptionCreate(Base):
    title: Annotated[str, Field(min_length=3, max_length=160)]
    kind: ExceptionKind
    severity: Annotated[int, Field(ge=1, le=5)]
    granted_at: int
    expires_at: int
    description: str | None = Field(default=None, max_length=4000)
    control_id: str
    service_ids: Annotated[list[str], Field(min_length=1, max_length=25)]
    owner_id: str
    approver_id: str | None = None
    compensating_control_ids: list[str] = []
    evidence: list[EvidenceIn] = []
    activate: bool = False


class ExceptionOut(Base):
    id: str
    title: str
    kind: ExceptionKind
    status: ExceptionStatus
    effective_status: EffectiveStatus
    severity: int
    granted_at: int
    expires_at: int
    description: str | None = None
    version: int
    control: Ref
    services: list[Ref]
    owner: Ref
    approver: Ref | None
    compensating_controls: list[Ref]
    evidence: list[Ref] = []
    renewal_chain: list[str]
    open_alert_ids: list[str]
    condition_expr: str | None = None
    condition_met: bool | None = None


class TimelineEvent(Base):
    at: int
    kind: str
    summary: str
    ref: Ref | None = None


# ---------------------------------------------------------------- reviews
class Assignee(Base):
    person: Ref
    rank: int
    reason_code: Literal["owner_valid", "team_lead", "approver", "workspace_admin"]
    reason: str


class Precedent(Base):
    outcome_id: str
    decision: Decision
    note: str
    decided_at: int
    same_service: bool
    renewal_depth: int | None
    exception_id: str


class ReviewOut(Base):
    id: str
    status: Literal["draft", "pending", "decided", "cancelled"]
    alert: Ref
    exception: Ref
    assignees: list[Assignee]
    rationale: str
    precedent: list[Precedent]
    decision: Decision | None = None
    decision_note: str | None = None
    decided_at: int | None = None
    opened_at: int
    version: int


class ProposeReviewIn(Base):
    exception_id: str | None = None
    rationale: str | None = Field(default=None, max_length=2000)


class ReviewDecisionIn(Base):
    decision: Decision
    note: Annotated[str, Field(min_length=10, max_length=2000)]
    new_expires_at: int | None = None
    new_owner_id: str | None = None
    defer_until: int | None = None


# ---------------------------------------------------------------- api keys
class ApiKeyIn(Base):
    name: Annotated[str, Field(min_length=1, max_length=100)]
    role: Role = Role.admin
    expires_in_days: int | None = Field(default=None, ge=1, le=365)
    test_key: bool = False


class ApiKeyOut(Base):
    id: str
    name: str
    prefix: str
    preview: str
    role: Role
    scopes: list[str] = []
    created_by: str
    created_at: int
    expires_at: int | None = None
    last_used_at: int | None = None
    revoked: bool = False
    revoked_at: int | None = None
    status: Literal["active", "expired", "revoked"]


class ApiKeyCreatedOut(ApiKeyOut):
    secret: str


# ---------------------------------------------------------------- registry
class EntityOut(Base):
    id: str
    label: str
    name: str
    props: dict[str, Any]
    edges: list[dict[str, Any]] = []


class EntityIn(Base):
    model_config = ConfigDict(extra="allow")
    name: Annotated[str, Field(min_length=1, max_length=160)]


# ---------------------------------------------------------------- steward
class Citation(Base):
    kind: str
    id: str
    label: str


class ProposedAction(Base):
    action_id: str
    type: Literal["create_review", "approve_draft_exception", "acknowledge_alert"]
    title: str
    payload: dict[str, Any]
    requires_role: Role
    expires_at: int


class StewardAnswer(Base):
    answer_markdown: str
    citations: list[Citation]
    proof_paths: list[ProofPath] = []
    proposed_actions: list[ProposedAction] = []
    used_tools: list[str]
    removed_claims: int = 0


class ChatIn(Base):
    content: Annotated[str, Field(min_length=1, max_length=4000)]
    context: dict[str, str] | None = None


class NotificationOut(Base):
    id: str
    kind: str
    title: str
    body: str | None
    ref_kind: str | None
    ref_id: str | None
    created_at: int
    read_at: int | None


class ProblemDetails(Base):
    type: str
    title: str
    status: int
    detail: str | None = None
    code: str
    request_id: str
    errors: list[dict[str, Any]] | None = None
