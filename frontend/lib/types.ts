// TypeScript mirror of backend/app/models/api.py. Timestamps are epoch seconds.

export type Role = "owner" | "admin" | "reviewer" | "member" | "viewer";
export const ROLE_RANK: Record<Role, number> = { viewer: 0, member: 1, reviewer: 2, admin: 3, owner: 4 };
export const hasRole = (role: Role | undefined, min: Role) => !!role && ROLE_RANK[role] >= ROLE_RANK[min];

export type ExceptionKind =
  | "security_waiver"
  | "flag_override"
  | "skipped_test"
  | "cost_limit_extension"
  | "data_export_permission"
  | "emergency_change";
export type ExceptionStatus = "draft" | "active" | "renewed" | "revoked" | "closed";
export type EffectiveStatus = "draft" | "active" | "expiring" | "expired" | "renewed" | "revoked" | "closed";
export type Severity = "low" | "moderate" | "high" | "critical";
export type AlertStatus = "open" | "acknowledged" | "snoozed" | "resolved";
export type Decision = "renew" | "revoke" | "close" | "reassign" | "defer";
export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8";
export type WorkspaceStatus = "provisioning" | "ready" | "failed" | "deleting";
export type AiMode = "cloud" | "private" | "off";
export type ClockMode = "live" | "simulated";

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

export interface Ref {
  kind: string;
  id: string;
  label?: string | null;
}

// account / workspaces
export interface Membership {
  workspace_id: string;
  slug: string;
  name: string;
  role: Role;
  person_id: string | null;
  status: WorkspaceStatus;
  description?: string;
}
export interface UserOut {
  id: string;
  email: string;
  name: string | null;
  prefs: Record<string, unknown>;
}
export interface MeOut {
  user: UserOut;
  memberships: Membership[];
}
export interface MePatch {
  name?: string | null;
  prefs?: Record<string, unknown> | null;
}
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
export interface WorkspaceCreate {
  name: string;
  slug: string;
  data_mode: "sample" | "blank";
}
export interface WorkspaceOut {
  id: string;
  slug: string;
  name: string;
  status: WorkspaceStatus;
  data_mode: "sample" | "blank" | "import";
  clock_mode: ClockMode;
  as_of: number;
  ai_mode: AiMode;
  onboarding_step: string;
  onboarding_done: boolean;
  role: Role;
  person_id: string | null;
  last_sentinel_at: number | null;
}
export interface OnboardingPatch {
  step: "identity" | "rules" | "invite" | "ready" | "done";
}
export interface LinkPerson {
  person_id: string | null;
}
export interface ClockIn {
  as_of: number;
}
export interface ClockOut {
  clock_mode: ClockMode;
  as_of: number;
}
export interface AiSettings {
  ai_mode: AiMode;
}

export interface ApiKeyOut {
  id: string;
  name: string;
  prefix: string;
  preview: string;
  role: Role;
  scopes: string[];
  created_by: string;
  created_at: number;
  expires_at: number | null;
  last_used_at: number | null;
  revoked: boolean;
  revoked_at: number | null;
  status: "active" | "expired" | "revoked";
}

export interface ApiKeyCreatedOut extends ApiKeyOut {
  secret: string;
}

export interface ApiKeyCreateIn {
  name: string;
  role?: Role;
  expires_in_days?: number | null;
  test_key?: boolean;
}

// graph / proof
export interface ProofNode {
  id: string;
  label: string;
  name: string;
}
export interface ProofEdge {
  from: string;
  to: string;
  type: string;
}
export interface ProofPath {
  summary: string;
  nodes: ProofNode[];
  edges: ProofEdge[];
}
export interface GraphNode {
  id: string;
  label: string;
  name: string;
  severity: number | null;
  status: string | null;
  score: number | null;
}
export interface GraphOut {
  nodes: GraphNode[];
  edges: ProofEdge[];
  truncated: boolean;
  total: number;
}

// risk / alerts
export interface ScoreContribution {
  exception_id: string;
  hops: number;
  base: number;
  age_factor: number;
  overdue: number;
  centrality: number;
  value: number;
}
export interface ScoreBreakdown {
  service_id: string;
  raw: number;
  multiplier: number;
  score: number;
  band: Severity;
  contributions: ScoreContribution[];
  rule_hits: string[];
  config_version: number;
  as_of: number;
}
export interface ServiceRisk {
  service: Ref;
  tier: number;
  customer_facing: boolean;
  team: Ref | null;
  score: number;
  band: Severity;
  rule_hits: string[];
  active_exceptions: number;
}
export interface ServiceRiskDetail extends ServiceRisk {
  breakdown: ScoreBreakdown;
  proof: ProofPath | null;
  alert_ids: string[];
  names: Record<string, string>;
}
export interface RiskSummary {
  as_of: number;
  open_alerts: Record<string, number>;
  active_exceptions: number;
  expiring_7d: number;
  my_reviews: number;
}
export interface RunwayItem {
  team: Ref;
  exception: Ref;
  expires_at: number;
  severity: number;
}
export interface TrendPoint {
  as_of: number;
  score: number;
  band: Severity;
}
export interface AlertOut {
  id: string;
  rule_id: RuleId;
  severity: Severity;
  status: AlertStatus;
  title: string;
  summary: string | null;
  score: number | null;
  subject: Ref;
  involved: Ref[];
  proof: ProofPath;
  breakdown: ScoreBreakdown | null;
  created_at: number;
  last_seen_at: number | null;
  snoozed_until: number | null;
  feedback?: "useful" | "not_useful" | null;
  version: number;
}
export interface SnoozeIn {
  until: number;
  reason: string;
}
export interface ResolveIn {
  note: string;
}
export interface FeedbackIn {
  useful: boolean;
  note?: string | null;
}

// exceptions
export interface EvidenceIn {
  kind: "ticket" | "chat" | "doc" | "email" | "other";
  source_ref: string;
  excerpt?: string | null;
}
export interface ExceptionCreate {
  title: string;
  kind: ExceptionKind;
  severity: number;
  granted_at: number;
  expires_at: number;
  description?: string | null;
  control_id: string;
  service_ids: string[];
  owner_id: string;
  approver_id?: string | null;
  compensating_control_ids?: string[];
  evidence?: EvidenceIn[];
  activate?: boolean;
}
export interface ExceptionOut {
  id: string;
  title: string;
  kind: ExceptionKind;
  status: ExceptionStatus;
  effective_status: EffectiveStatus;
  severity: number;
  granted_at: number;
  expires_at: number;
  description?: string | null;
  version: number;
  control: Ref;
  services: Ref[];
  owner: Ref;
  approver: Ref | null;
  compensating_controls: Ref[];
  evidence: Ref[];
  renewal_chain: string[];
  open_alert_ids: string[];
  condition_expr?: string | null;
  condition_met?: boolean | null;
}
export interface TimelineEvent {
  at: number;
  kind: string;
  summary: string;
  ref?: Ref | null;
}

// reviews
export interface Assignee {
  person: Ref;
  rank: number;
  reason_code: "owner_valid" | "team_lead" | "approver" | "workspace_admin";
  reason: string;
}
export interface Precedent {
  outcome_id: string;
  decision: Decision;
  note: string;
  decided_at: number;
  same_service: boolean;
  renewal_depth: number | null;
  exception_id: string;
}
export interface ReviewOut {
  id: string;
  status: "draft" | "pending" | "decided" | "cancelled";
  alert: Ref;
  exception: Ref;
  assignees: Assignee[];
  rationale: string;
  precedent: Precedent[];
  decision?: Decision | null;
  decision_note?: string | null;
  decided_at?: number | null;
  opened_at: number;
  version: number;
}
export interface ProposeReviewIn {
  exception_id?: string | null;
  rationale?: string | null;
}
export interface ReviewDecisionIn {
  decision: Decision;
  note: string;
  new_expires_at?: number | null;
  new_owner_id?: string | null;
  defer_until?: number | null;
}

// registry
export interface EntityOut {
  id: string;
  label: string;
  name: string;
  props: Record<string, unknown>;
  edges: Record<string, unknown>[];
}
export interface EntityIn {
  name: string;
  [key: string]: unknown;
}

// steward
export interface Citation {
  kind: string;
  id: string;
  label: string;
}
export interface ProposedAction {
  action_id: string;
  type: "create_review" | "approve_draft_exception" | "acknowledge_alert";
  title: string;
  payload: Record<string, unknown>;
  requires_role: Role;
  expires_at: number;
}
export interface StewardAnswer {
  answer_markdown: string;
  citations: Citation[];
  proof_paths: ProofPath[];
  proposed_actions: ProposedAction[];
  used_tools: string[];
  removed_claims: number;
}
export interface ChatIn {
  content: string;
  context?: Record<string, string> | null;
}
export interface NotificationOut {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  ref_kind: string | null;
  ref_id: string | null;
  created_at: number;
  read_at: number | null;
}

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "EMAIL_NOT_VERIFIED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "VERSION_CONFLICT"
  | "INVARIANT_VIOLATION"
  | "WORKSPACE_DATA_MISSING"
  | "WORKSPACE_PROVISIONING"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "LLM_UNAVAILABLE"
  | "AI_DISABLED"
  | "INTERNAL";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string | null;
  code: ErrorCode | string;
  request_id: string;
  errors?: { field?: string; message?: string; [k: string]: unknown }[] | null;
}

/** Score bands, 03 §8.4. */
export function bandFor(score: number): Severity {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "moderate";
  return "low";
}

/** Exception severity 1..5 mapped onto the four bands. */
export function severityFromLevel(level: number): Severity {
  if (level >= 5) return "critical";
  if (level === 4) return "high";
  if (level === 3) return "moderate";
  return "low";
}

/** GET /people rows (flat person properties plus current teams). */
export interface PersonRow {
  id: string;
  name: string;
  email?: string | null;
  title?: string | null;
  role?: string | null;
  status: "active" | "left";
  teams: Ref[];
  owned_active: number;
}

/** GET /reviews rows. */
export interface ReviewListItem {
  id: string;
  status: ReviewOut["status"];
  opened_at: number;
  decision?: Decision | null;
  decided_at?: number | null;
  alert: Ref;
  exception: Ref;
  assignees: Assignee[];
}
export type ReviewPage = Page<ReviewListItem> & { needs_identity?: boolean };
/** GET /reviews/{id} adds whether the caller may decide; POST /decide adds the applied effects. */
export type ReviewDetail = ReviewOut & { can_decide?: boolean; effects?: string[] };

// Prediction and Temporal Simulation Types
export interface ProofEdge {
  from: string;
  to: string;
  type: string;
}

export interface ProofGraph {
  nodes: string[];
  edges: ProofEdge[];
}

export interface AvalancheCentralityItem {
  service_id: string;
  service_name: string;
  score: number;
  band: Severity;
  spof_rank: number;
  cascade_probability: number;
  reachable_services: string[];
  customer_paths: string[];
  proof: ProofGraph;
}

export interface TemporalCollisionItem {
  cluster_id: string;
  window_start: number;
  window_end: number;
  exception_ids: string[];
  affected_services: string[];
  collision_severity?: number;
  severity_score?: number;
  severity_band?: Severity;
  proof: ProofGraph;
}

export interface CanvasNodeDecoration {
  node_id: string;
  simulated_score: number;
  risk_band: Severity;
  color: string;
  pulse: boolean;
  pulse_color?: string | null;
  spof_rank?: number | null;
  cascade_probability?: number | null;
  collision_count: number;
  is_target: boolean;
}

export interface SimulationForecastOut {
  as_of: number;
  projected_date: number;
  horizon_days: number;
  target_service_id?: string | null;
  avalanche_centrality: AvalancheCentralityItem[];
  temporal_collisions: TemporalCollisionItem[];
  canvas_decorations: Record<string, CanvasNodeDecoration>;
  execution_time_ms: number;
}
