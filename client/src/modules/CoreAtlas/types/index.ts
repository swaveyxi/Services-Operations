// Core Atlas domain types — reconciled against the real backend (see
// docs/Atlas_API_doc.md and server/src/services/atlas.service.ts, which is
// the proxy layer these shapes actually come from). Field names are
// snake_case throughout, matching this app's API convention — Atlas's own
// wire format is camelCase; the server-side proxy does that translation, not
// the client.

// ─── Campaign ───────────────────────────────────────────────────────────────

export type AtlasCampaignStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';

export type AtlasCampaign = {
  id: string; // this app's own campaign id (the /atlas/:id route param)
  campaign_id: string; // this app's human-readable business key, e.g. "CB/MARCH/2026"
  name: string;
  client: { id: string; display_name: string; abbreviation: string | null } | null;
  owner_name: string | null;
  unit: 'Recruitment' | 'Scholarships' | 'Testing';
  description: string | null;
  campaign_status: string; // this app's own Draft|Workplan|Profitability|Active|Closed
  created_at: string;
  updated_at: string;
  profitability: {
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    profit_percent: number;
  };
  // Everything below is Core Atlas's own execution state.
  atlas_status: AtlasCampaignStatus;
  opened_at: string;
  target_close_at: string | null;
  closed_at: string | null;
  candidate_totals: { total: number; active: number; withdrawn: number; completed: number };
  shortlist_count: number;
  report_count: number;
};

// ─── Pipeline stages ────────────────────────────────────────────────────────

export type PipelineStageStatus = 'AWAITING' | 'ACTIVE' | 'NEEDS_ACTION' | 'COMPLETED';

export type PipelineStageStats = {
  candidate_count: number;
  result_count: number;
  completion_rate: number;
  pass_count: number;
  fail_count: number;
  pending_count: number;
  pass_rate: number;
  mean_score: number | null;
  min_score: number | null;
  max_score: number | null;
  flag_count: number;
  flagged_candidates: number;
};

export type PipelineStage = {
  platform_slug: string;
  platform_name: string;
  platform_category: string;
  stage_order: number;
  status: PipelineStageStatus;
  progression_mode: 'MANUAL' | 'AUTOMATIC';
  threshold: number | null;
  candidates: number;
  activated_at: string | null;
  completed_at: string | null;
  stats: PipelineStageStats;
};

// ─── Candidates ─────────────────────────────────────────────────────────────

export type CandidateIdentityState = 'CONFIRMED' | 'PROVISIONAL' | 'FLAGGED';
export type CandidateStatus = 'ACTIVE' | 'WITHDRAWN' | 'COMPLETED';

export type Candidate = {
  id: string; // campaign-candidate id
  guid: string; // cross-campaign candidate identity
  name: string;
  email: string | null;
  phone: string | null;
  nin_masked: string | null; // Atlas never returns a full NIN — last 3 digits only, by design
  identity_state: CandidateIdentityState;
  identity_confidence: string;
  status: CandidateStatus;
  current_stage_slug: string | null; // a platform slug, e.g. "fot" — not a fixed enum
  current_platform_status: PipelineStageStatus | null;
  is_returning: boolean;
  invited_at: string;
  invited_by_platform: string | null;
  stage_count: number;
};

export type CandidateStageResult = {
  id: string;
  platformSlug: string;
  stageOrder: number;
  computedOutcome: 'PASS' | 'FAIL' | 'PENDING';
  compositeScore: number | null;
  flagCount: number;
  rawData: Record<string, unknown>;
  completedAt: string;
  createdAt: string;
};

export type CandidateProgressionEvent = {
  id: string;
  fromPlatform: string;
  toPlatform: string;
  triggeredBy: string;
  shortlistId: string | null;
  occurredAt: string;
};

export type CandidateCommunicationSummary = {
  id: string;
  platformSlug: string;
  channel: string;
  messageType: string;
  currentState: string;
  sentAt: string | null;
  deliveredAt: string | null;
};

export type CandidateShortlistMembership = {
  shortlistId: string;
  shortlistName: string;
  platformSlug: string;
  platformName: string;
  status: string;
  source: string;
  matchReason: string | null;
  addedAt: string;
};

// The full candidate profile — everything on Candidate plus the detail
// sections Atlas returns on GET .../candidates/:candidateId. `meta` is
// arbitrary per-campaign application data set at invite time (e.g.
// {degree, grade}) — there's no fixed application-field schema, so it's
// rendered generically, not as named rows.
export type CandidateProfile = Candidate & {
  meta: Record<string, unknown>;
  stage_results: CandidateStageResult[];
  progression_history: CandidateProgressionEvent[];
  communications: CandidateCommunicationSummary[];
  shortlist_memberships: CandidateShortlistMembership[];
};

export type PipelineDistribution = {
  total_candidates: number;
  active: number;
  withdrawn: number;
  completed: number;
  needs_action: number;
};

// ─── Communications ─────────────────────────────────────────────────────────

export type CommsOverview = {
  totals: {
    messages: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    responded: number;
    failed: number;
    inFlight: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    failureRate: number;
    responseRate: number;
  };
  by_channel: {
    channel: string;
    messages: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }[];
};

export type CommsPlatform = {
  platform_slug: string;
  sent: number;
  delivered: number;
  failed: number;
  delivery_rate: number;
  failure_rate: number;
  has_detail: boolean;
};

export type FlaggedCandidate = {
  id: string;
  guid: string;
  display_name: string | null;
  channel: string;
  failed_count: number;
  last_failure_at: string;
  message_types: string[];
  escalated: boolean;
};

export type CommsMessage = {
  id: string;
  platform_slug: string;
  channel: string;
  message_type: string;
  current_state: string;
  created_at: string;
  events: {
    canonicalState: string;
    providerEventId: string;
    isDuplicate: boolean;
    isInvalid: boolean;
    occurredAt: string;
    receivedAt: string;
  }[];
};

export type CandidateCommsProfile = {
  guid: string;
  messages: CommsMessage[];
};

// ─── Reports ────────────────────────────────────────────────────────────────

export type ReportType = 'STAGE' | 'CAMPAIGN' | 'CUSTOM';
export type ReportStatus = 'GENERATING' | 'READY' | 'FAILED';

export type ReportSummary = {
  id: string;
  report_type: ReportType;
  scope_slug: string | null;
  title: string;
  status: ReportStatus;
  version: number;
  generated_by: string;
  prompt: string | null;
  generated_at: string;
  error: string | null;
};

// Generic, kind-driven section format — this is Atlas's own design, not a
// mock convenience: "a new report type needs no frontend change, it just
// emits a different sequence of sections."
export type ReportMetric = { label: string; value: number | string; unit?: string };
export type ReportTableColumn = { key: string; label: string; align?: 'left' | 'right' };
export type ReportSection =
  | {
      kind: 'table';
      heading: string;
      columns: ReportTableColumn[];
      rows: Record<string, unknown>[];
    }
  | { kind: 'metrics'; heading: string; metrics: ReportMetric[] }
  | { kind: 'text'; heading: string; paragraphs: string[] };

export type ReportData = {
  title: string;
  report_type: ReportType;
  generated_at: string;
  campaign: {
    id: string;
    external_id: string;
    name: string;
    client_name: string;
    campaign_type: string;
    status: string;
  };
  summary: ReportMetric[];
  sections: ReportSection[];
  narrative?: string[]; // CUSTOM reports only
};

export type ReportDetail = {
  id: string;
  report_type: ReportType;
  scope_slug: string | null;
  title: string;
  status: ReportStatus;
  prompt: string | null;
  generated_at: string;
  error: string | null;
  data: ReportData | null;
};

// ─── Shortlists ─────────────────────────────────────────────────────────────
// Real, per-stage, versioned resource — a campaign can have many shortlists
// (one or more per platform_slug), each progressing DRAFT → LOCKED →
// PROGRESSED, or SUPERSEDED if a competing locked shortlist for the same
// stage gets locked first.

export type ShortlistStatus = 'DRAFT' | 'LOCKED' | 'PROGRESSED' | 'SUPERSEDED' | 'DISCARDED';
export type MemberSource = 'PLATFORM_DATA' | 'MANUAL_UPLOAD' | 'AI_MATCHED';

export type Shortlist = {
  id: string;
  campaign_id: string;
  campaign_platform_id: string;
  platform_slug: string;
  name: string;
  status: ShortlistStatus;
  criteria_applied: string | null;
  candidate_count: number;
  version: number;
  created_by: string;
  locked_at: string | null;
  locked_by: string | null;
  created_at: string;
  updated_at: string;
  query_history: unknown[];
  manual_overrides: unknown;
};

export type ShortlistMember = {
  id: string;
  campaign_candidate_id: string;
  guid: string;
  display_name: string;
  email: string | null;
  source: MemberSource;
  is_override: boolean;
  override_reason: string | null;
  match_reason: string | null;
  added_at: string;
  current_stage_slug: string | null;
  status: string;
  // Arbitrary application-form data captured at invite/CSV-upload time — no
  // fixed schema, varies per campaign's own CSV columns.
  application_fields: Record<string, unknown>;
};

// No `from_platform` here — the shortlist's own `platform_slug` already is
// the source stage progression always moves candidates out of.
export type ShortlistProgressionSummary = {
  destination_platform_slug: string;
  candidate_count: number;
  progressed_by: string;
  progressed_at: string;
  status: string;
  completed_at: string | null;
};

export type ShortlistBrief = {
  file_name: string;
  uploaded_at: string;
  extracted_criteria: Record<string, unknown> | null;
  byte_length: number;
  extraction_note: string | null;
};

export type ShortlistDetail = Shortlist & {
  members: ShortlistMember[];
  brief: ShortlistBrief | null;
  progression: ShortlistProgressionSummary | null;
};

export type ShortlistQueryMatchStageResult = {
  platform_slug: string;
  computed_outcome: string;
  composite_score: number | null;
  flag_count: number;
  data: unknown;
};

export type ShortlistQueryMatch = {
  campaign_candidate_id: string;
  guid: string;
  display_name: string;
  current_stage_slug: string | null;
  is_returning: boolean;
  application_fields: Record<string, unknown>;
  stage_results: ShortlistQueryMatchStageResult[];
  match_reasons: string[];
  confidence: string;
  already_member: boolean;
};

// `mode: 'QUEUED'` means the pool exceeded Atlas's sync limit — `matches` is
// empty and the caller must poll the shortlist detail's `query_history` for
// the completed entry (best-effort; unverified against a live large pool).
export type ShortlistQueryResult = {
  shortlist_id: string;
  query: string;
  mode: 'SYNC' | 'QUEUED';
  job_id: string | null;
  candidate_pool_size: number;
  matched_count: number;
  brief_criteria_applied: boolean;
  matches: ShortlistQueryMatch[];
};

export type ShortlistCandidateUploadResult = {
  added: number;
  skipped: { row: number; reason: string }[];
  candidate_count: number;
};
