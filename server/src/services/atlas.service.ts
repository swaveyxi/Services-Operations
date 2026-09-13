// Orchestration layer for the Core Atlas integration — resolves this app's
// campaign id to Atlas's own campaign id, calls atlasClient, and reshapes
// Atlas's camelCase responses into this app's snake_case convention. See
// docs/Atlas_API_doc.md for the real API this wraps, and the approved plan
// (so-the-teams-said-purrfect-rivest.md) for the design this follows.
import createError from 'http-errors';
import { atlasGet, atlasPost, atlasDelete, atlasGetRaw, atlasPostMultipart, AtlasApiError } from './atlasClient.service';
import {
  findCampaignById,
  updateCampaign,
  getRevenueItems,
  getCostItems,
  type CampaignRow,
} from '../models/campaigns';
import { findClientById } from '../models/clients';
import { findUserById } from '../models/users';
import { calcProfitability } from './profitability.service';

// ─── Registration (Builder-time only — see Part 1 of the plan) ────────────────

export type AtlasStageInput = {
  platform_slug: string;
  stage_order: number;
  progression_mode: 'Manual' | 'Automatic';
  threshold?: number;
};

const UNIT_TO_CAMPAIGN_TYPE: Record<CampaignRow['unit'], string> = {
  Recruitment: 'RECRUITMENT',
  Scholarships: 'SCHOLARSHIP',
  Testing: 'TESTING',
};

type AtlasCampaignCreateResponse = {
  id: string;
  externalId: string;
  warnings?: string[];
};

// Called once, right after a campaign row is created in Builder — never from
// a read path. Best-effort: the caller decides what to do if this throws
// (campaign creation itself must not fail because Atlas is unreachable).
export async function registerCampaignWithAtlas(
  campaign: CampaignRow,
  stages: AtlasStageInput[],
): Promise<string> {
  const client = campaign.client_id ? await findClientById(campaign.client_id) : null;

  const { data } = await atlasPost<AtlasCampaignCreateResponse>('/campaigns', {
    externalId: campaign.id,
    name: campaign.name,
    clientName: client?.display_name ?? 'Unknown Client',
    campaignType: UNIT_TO_CAMPAIGN_TYPE[campaign.unit],
    openedAt: campaign.created_at.toISOString(),
    stages: stages.map((s) => ({
      platformSlug: s.platform_slug,
      stageOrder: s.stage_order,
      progressionMode: s.progression_mode === 'Automatic' ? 'AUTOMATIC' : 'MANUAL',
      ...(s.threshold !== undefined ? { threshold: s.threshold } : {}),
    })),
  });

  await updateCampaign(campaign.id, { atlas_campaign_id: data.id });
  return data.id;
}

// Every read function below calls this first. Throws a 409-style "not
// registered yet" error (not a 500) if the case was created without stages,
// or Atlas registration failed at creation time — see the plan's accepted
// tradeoff for why there's no lazy-create fallback here.
function requireAtlasCampaignId(campaign: CampaignRow): string {
  if (!campaign.atlas_campaign_id) {
    throw createError(409, 'This case has not been registered with Core Atlas yet.');
  }
  return campaign.atlas_campaign_id;
}

async function loadCampaign(id: string): Promise<CampaignRow> {
  const campaign = await findCampaignById(id);
  if (!campaign) throw createError(404, 'Campaign not found.');
  return campaign;
}

// Write endpoints: every non-2xx from Atlas is meaningful here (409 conflict,
// 422 bad input, 503 AI unavailable), unlike the read side's ad hoc 404→null
// catches — surface Atlas's own status/message instead of a generic 500.
function rethrowAtlas(err: unknown): never {
  if (err instanceof AtlasApiError) throw createError(err.status, err.message);
  throw err;
}

// ─── Campaign detail (merges this app's own campaign — profitability, owner,
//     description — with Atlas's execution-side detail) ───────────────────────

type AtlasCampaignDetailResponse = {
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  openedAt: string;
  targetCloseAt: string | null;
  closedAt: string | null;
  candidateTotals: { total: number; active: number; withdrawn: number; completed: number };
  shortlistCount: number;
  reportCount: number;
};

export async function getCampaign(id: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  const [revenueItems, costItems, owner, client, atlas] = await Promise.all([
    getRevenueItems(id),
    getCostItems(id),
    findUserById(campaign.owner_user_id),
    campaign.client_id ? findClientById(campaign.client_id) : null,
    atlasGet<AtlasCampaignDetailResponse>(`/campaigns/${atlasId}`),
  ]);

  return {
    id: campaign.id,
    campaign_id: campaign.campaign_id,
    name: campaign.name,
    client: client
      ? { id: client.id, display_name: client.display_name, abbreviation: client.abbreviation }
      : null,
    owner_name: owner?.name ?? null,
    unit: campaign.unit,
    description: campaign.description,
    campaign_status: campaign.campaign_status,
    created_at: campaign.created_at.toISOString(),
    updated_at: campaign.updated_at.toISOString(),
    profitability: calcProfitability(revenueItems, costItems),
    atlas_status: atlas.data.status,
    opened_at: atlas.data.openedAt,
    target_close_at: atlas.data.targetCloseAt,
    closed_at: atlas.data.closedAt,
    candidate_totals: atlas.data.candidateTotals,
    shortlist_count: atlas.data.shortlistCount,
    report_count: atlas.data.reportCount,
  };
}

// ─── Pipeline stages ────────────────────────────────────────────────────────

type AtlasStageSummary = {
  id: string;
  platformSlug: string;
  platformName: string;
  platformCategory: string;
  stageOrder: number;
  status: 'AWAITING' | 'ACTIVE' | 'NEEDS_ACTION' | 'COMPLETED';
  progressionMode: 'MANUAL' | 'AUTOMATIC';
  threshold: number | null;
  candidateCount: number;
  activatedAt: string | null;
  completedAt: string | null;
  stats: Record<string, number>;
};

function reshapeStageStats(stats: Record<string, number>) {
  return {
    candidate_count: stats.candidateCount ?? 0,
    result_count: stats.resultCount ?? 0,
    progressed_count: stats.progressedCount ?? 0,
    completion_rate: stats.completionRate ?? 0,
    pass_count: stats.passCount ?? 0,
    fail_count: stats.failCount ?? 0,
    pending_count: stats.pendingCount ?? 0,
    pass_rate: stats.passRate ?? 0,
    mean_score: stats.meanScore ?? null,
    min_score: stats.minScore ?? null,
    max_score: stats.maxScore ?? null,
    flag_count: stats.flagCount ?? 0,
    flagged_candidates: stats.flaggedCandidates ?? 0,
  };
}

export async function getPipelineStages(id: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  const { data } = await atlasGet<AtlasStageSummary[]>(`/campaigns/${atlasId}/stages`);
  return data
    .sort((a, b) => a.stageOrder - b.stageOrder)
    .map((s) => ({
      platform_slug: s.platformSlug,
      platform_name: s.platformName,
      platform_category: s.platformCategory,
      stage_order: s.stageOrder,
      status: s.status,
      progression_mode: s.progressionMode,
      threshold: s.threshold,
      candidates: s.candidateCount,
      activated_at: s.activatedAt,
      completed_at: s.completedAt,
      stats: reshapeStageStats(s.stats),
    }));
}

// ─── Candidates ─────────────────────────────────────────────────────────────

type AtlasCandidateRow = {
  campaignCandidateId: string;
  guid: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  ninMasked: string | null;
  identityState: 'CONFIRMED' | 'PROVISIONAL' | 'FLAGGED';
  identityConfidence: string;
  status: 'ACTIVE' | 'WITHDRAWN' | 'COMPLETED';
  currentStageSlug: string | null;
  currentPlatformStatus: string | null;
  isReturning: boolean;
  invitedAt: string;
  invitedByPlatform: string | null;
  stageCount: number;
  meta: Record<string, unknown>;
};

function reshapeCandidateRow(c: AtlasCandidateRow) {
  return {
    id: c.campaignCandidateId,
    guid: c.guid,
    name: c.displayName,
    email: c.email,
    phone: c.phone,
    nin_masked: c.ninMasked,
    identity_state: c.identityState,
    identity_confidence: c.identityConfidence,
    status: c.status,
    current_stage_slug: c.currentStageSlug,
    current_platform_status: c.currentPlatformStatus,
    is_returning: c.isReturning,
    invited_at: c.invitedAt,
    invited_by_platform: c.invitedByPlatform,
    stage_count: c.stageCount,
    meta: c.meta,
  };
}

export async function getCandidates(
  id: string,
  query: { page?: number; limit?: number; stage?: string } = {},
) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.stage) params.set('stage', query.stage);
  params.set('limit', String(query.limit ?? 200)); // one full page covers most rosters today
  const { data, meta } = await atlasGet<AtlasCandidateRow[]>(
    `/campaigns/${atlasId}/candidates?${params}`,
  );
  return { candidates: data.map(reshapeCandidateRow), meta };
}

// Atlas has no dedicated distribution endpoint — derive it from the same
// roster page used for the candidates list.
export async function getPipelineDistribution(id: string) {
  const { candidates } = await getCandidates(id, { limit: 200 });
  return {
    total_candidates: candidates.length,
    active: candidates.filter((c) => c.status === 'ACTIVE').length,
    withdrawn: candidates.filter((c) => c.status === 'WITHDRAWN').length,
    completed: candidates.filter((c) => c.status === 'COMPLETED').length,
    needs_action: candidates.filter((c) => c.current_platform_status === 'NEEDS_ACTION').length,
  };
}

export async function getCandidateById(id: string, candidateId: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasGet<
      AtlasCandidateRow & {
        stageResults: unknown[];
        progressionHistory: unknown[];
        communications: unknown[];
        shortlistMemberships: unknown[];
      }
    >(`/campaigns/${atlasId}/candidates/${candidateId}`);
    return {
      ...reshapeCandidateRow(data),
      stage_results: data.stageResults,
      progression_history: data.progressionHistory,
      communications: data.communications,
      shortlist_memberships: data.shortlistMemberships,
    };
  } catch (err) {
    if (err instanceof AtlasApiError && err.status === 404) return null;
    throw err;
  }
}

// ─── Shortlists ─────────────────────────────────────────────────────────────
// Every mutating route here is OPS_HUB-only on Atlas's side — this app's
// service key already has that permission (campaign creation depends on it).

type AtlasShortlistView = {
  id: string;
  campaignId: string;
  campaignPlatformId: string;
  platformSlug: string;
  name: string;
  status: 'DRAFT' | 'LOCKED' | 'PROGRESSED' | 'SUPERSEDED' | 'DISCARDED';
  criteriaApplied: string | null;
  candidateCount: number;
  version: number;
  createdBy: string;
  lockedAt: string | null;
  lockedBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Internal shape undocumented — passed through opaque rather than guessed
  // at and mis-mapped; see the plan's flag on this.
  queryHistory: unknown[];
  manualOverrides: unknown;
};

type AtlasShortlistMember = {
  id: string;
  campaignCandidateId: string;
  guid: string;
  displayName: string;
  email: string | null;
  source: 'PLATFORM_DATA' | 'MANUAL_UPLOAD' | 'AI_MATCHED';
  isOverride: boolean;
  overrideReason: string | null;
  matchReason: string | null;
  addedAt: string;
  currentStageSlug: string | null;
  status: string;
  applicationFields: Record<string, unknown>;
};

function reshapeShortlistView(s: AtlasShortlistView) {
  return {
    id: s.id,
    campaign_id: s.campaignId,
    campaign_platform_id: s.campaignPlatformId,
    platform_slug: s.platformSlug,
    name: s.name,
    status: s.status,
    criteria_applied: s.criteriaApplied,
    candidate_count: s.candidateCount,
    version: s.version,
    created_by: s.createdBy,
    locked_at: s.lockedAt,
    locked_by: s.lockedBy,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
    query_history: s.queryHistory,
    manual_overrides: s.manualOverrides,
  };
}

function reshapeShortlistMember(m: AtlasShortlistMember) {
  return {
    id: m.id,
    campaign_candidate_id: m.campaignCandidateId,
    guid: m.guid,
    display_name: m.displayName,
    email: m.email,
    source: m.source,
    is_override: m.isOverride,
    override_reason: m.overrideReason,
    match_reason: m.matchReason,
    added_at: m.addedAt,
    current_stage_slug: m.currentStageSlug,
    status: m.status,
    application_fields: m.applicationFields,
  };
}

export async function listShortlists(
  id: string,
  query: { platform_slug?: string; status?: string } = {},
) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  const params = new URLSearchParams();
  if (query.platform_slug) params.set('platformSlug', query.platform_slug);
  if (query.status) params.set('status', query.status);
  params.set('limit', '200');
  const { data } = await atlasGet<AtlasShortlistView[]>(
    `/campaigns/${atlasId}/shortlists?${params}`,
  );
  return data.map(reshapeShortlistView);
}

type AtlasShortlistBrief = {
  fileName: string;
  uploadedAt: string;
  extractedCriteria: Record<string, unknown> | null;
  // Confirmed against a live response: the embedded brief on the shortlist
  // detail endpoint omits these two (present only on the upload response
  // itself) — reshape defensively rather than assuming symmetry.
  byteLength?: number;
  extractionNote?: string | null;
};

function reshapeShortlistBrief(brief: AtlasShortlistBrief | null) {
  if (!brief) return null;
  return {
    file_name: brief.fileName,
    uploaded_at: brief.uploadedAt,
    extracted_criteria: brief.extractedCriteria,
    byte_length: brief.byteLength ?? 0,
    extraction_note: brief.extractionNote ?? null,
  };
}

export async function getShortlistDetail(id: string, shortlistId: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasGet<
      AtlasShortlistView & {
        members: AtlasShortlistMember[];
        brief: AtlasShortlistBrief | null;
        // Confirmed against a live response: this embedded view is NOT the
        // same shape as the standalone POST .../progress response below —
        // no progressionId, no fromPlatform (the shortlist's own
        // platform_slug already is the source stage), and the destination
        // field is named differently (destinationSlug, not
        // destinationPlatformSlug). Reshape from what's actually here, not
        // from the POST response's documented shape.
        progression: {
          destinationSlug: string;
          candidateCount: number;
          progressedBy: string;
          progressedAt: string;
          status: string;
          completedAt: string | null;
        } | null;
      }
    >(`/campaigns/${atlasId}/shortlists/${shortlistId}`);
    return {
      ...reshapeShortlistView(data),
      members: data.members.map(reshapeShortlistMember),
      brief: reshapeShortlistBrief(data.brief),
      progression: data.progression
        ? {
            destination_platform_slug: data.progression.destinationSlug,
            candidate_count: data.progression.candidateCount,
            progressed_by: data.progression.progressedBy,
            progressed_at: data.progression.progressedAt,
            status: data.progression.status,
            completed_at: data.progression.completedAt,
          }
        : null,
    };
  } catch (err) {
    if (err instanceof AtlasApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createShortlist(
  id: string,
  input: { platform_slug: string; name: string; created_by: string },
) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasPost<AtlasShortlistView>(`/campaigns/${atlasId}/shortlists`, {
      platformSlug: input.platform_slug,
      name: input.name,
      createdBy: input.created_by,
    });
    return reshapeShortlistView(data);
  } catch (err) {
    rethrowAtlas(err);
  }
}

type AtlasQueryMatch = {
  campaignCandidateId: string;
  guid: string;
  displayName: string;
  currentStageSlug: string | null;
  isReturning: boolean;
  applicationFields: Record<string, unknown>;
  stageResults: { platformSlug: string; computedOutcome: string; compositeScore: number | null; flagCount: number; data: unknown }[];
  matchReasons: string[];
  confidence: string;
  alreadyMember: boolean;
};

export async function queryShortlist(
  id: string,
  shortlistId: string,
  input: { query: string; context_platform_slugs?: string[]; max_results?: number },
) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasPost<{
      shortlistId: string;
      query: string;
      mode: 'SYNC' | 'QUEUED';
      matches?: AtlasQueryMatch[];
      jobId?: string;
      candidatePoolSize: number;
      matchedCount: number;
      briefCriteriaApplied: boolean;
    }>(`/campaigns/${atlasId}/shortlists/${shortlistId}/query`, {
      query: input.query,
      ...(input.context_platform_slugs ? { contextPlatformSlugs: input.context_platform_slugs } : {}),
      ...(input.max_results ? { maxResults: input.max_results } : {}),
    });
    return {
      shortlist_id: data.shortlistId,
      query: data.query,
      mode: data.mode,
      job_id: data.jobId ?? null,
      candidate_pool_size: data.candidatePoolSize,
      matched_count: data.matchedCount,
      brief_criteria_applied: data.briefCriteriaApplied,
      matches: (data.matches ?? []).map((m) => ({
        campaign_candidate_id: m.campaignCandidateId,
        guid: m.guid,
        display_name: m.displayName,
        current_stage_slug: m.currentStageSlug,
        is_returning: m.isReturning,
        application_fields: m.applicationFields,
        stage_results: m.stageResults.map((r) => ({
          platform_slug: r.platformSlug,
          computed_outcome: r.computedOutcome,
          composite_score: r.compositeScore,
          flag_count: r.flagCount,
          data: r.data,
        })),
        match_reasons: m.matchReasons,
        confidence: m.confidence,
        already_member: m.alreadyMember,
      })),
    };
  } catch (err) {
    rethrowAtlas(err);
  }
}

export async function addShortlistMembers(
  id: string,
  shortlistId: string,
  members: { campaign_candidate_id: string; source: 'PLATFORM_DATA' | 'MANUAL_UPLOAD' | 'AI_MATCHED'; match_reason?: string }[],
) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasPost<{ added: number; updated: number; candidateCount: number }>(
      `/campaigns/${atlasId}/shortlists/${shortlistId}/members`,
      {
        members: members.map((m) => ({
          campaignCandidateId: m.campaign_candidate_id,
          source: m.source,
          ...(m.match_reason ? { matchReason: m.match_reason } : {}),
        })),
      },
    );
    return { added: data.added, updated: data.updated, candidate_count: data.candidateCount };
  } catch (err) {
    rethrowAtlas(err);
  }
}

export async function removeShortlistMember(id: string, shortlistId: string, memberId: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasDelete<{ removed: boolean; candidateCount: number }>(
      `/campaigns/${atlasId}/shortlists/${shortlistId}/members/${memberId}`,
    );
    return { removed: data.removed, candidate_count: data.candidateCount };
  } catch (err) {
    rethrowAtlas(err);
  }
}

export async function lockShortlist(id: string, shortlistId: string, locked_by: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasPost<{ shortlist: AtlasShortlistView; supersededIds: string[] }>(
      `/campaigns/${atlasId}/shortlists/${shortlistId}/lock`,
      { lockedBy: locked_by },
    );
    return { shortlist: reshapeShortlistView(data.shortlist), superseded_ids: data.supersededIds };
  } catch (err) {
    rethrowAtlas(err);
  }
}

export async function discardShortlist(id: string, shortlistId: string, discarded_by: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasPost<AtlasShortlistView>(
      `/campaigns/${atlasId}/shortlists/${shortlistId}/discard`,
      { discardedBy: discarded_by },
    );
    return reshapeShortlistView(data);
  } catch (err) {
    rethrowAtlas(err);
  }
}

export async function progressShortlist(
  id: string,
  shortlistId: string,
  input: { destination_platform_slug: string; progressed_by: string; note?: string },
) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasPost<{
      progressionId: string;
      shortlistId: string;
      fromPlatform: string;
      destinationPlatformSlug: string;
      candidateCount: number;
      progressedBy: string;
      progressedAt: string;
      status: 'PENDING' | 'COMPLETED' | 'FAILED';
      jobId: string | null;
      skippedCount: number;
    }>(`/campaigns/${atlasId}/shortlists/${shortlistId}/progress`, {
      destinationPlatformSlug: input.destination_platform_slug,
      progressedBy: input.progressed_by,
      ...(input.note ? { note: input.note } : {}),
    });
    return {
      progression_id: data.progressionId,
      shortlist_id: data.shortlistId,
      from_platform: data.fromPlatform,
      destination_platform_slug: data.destinationPlatformSlug,
      candidate_count: data.candidateCount,
      progressed_by: data.progressedBy,
      progressed_at: data.progressedAt,
      status: data.status,
      job_id: data.jobId,
      skipped_count: data.skippedCount,
    };
  } catch (err) {
    rethrowAtlas(err);
  }
}

type UploadedFile = { buffer: Buffer; originalname: string; mimetype: string };

export async function uploadShortlistCandidates(id: string, shortlistId: string, file: UploadedFile) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasPostMultipart<{
      added: number;
      skipped: { row: number; reason: string }[];
      candidateCount: number;
    }>(`/campaigns/${atlasId}/shortlists/${shortlistId}/upload-candidates`, file);
    return { added: data.added, skipped: data.skipped, candidate_count: data.candidateCount };
  } catch (err) {
    rethrowAtlas(err);
  }
}

export async function uploadShortlistBrief(id: string, shortlistId: string, file: UploadedFile) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasPostMultipart<{
      fileName: string;
      uploadedAt: string;
      extractedCriteria: Record<string, unknown> | null;
      byteLength: number;
      extractionNote: string | null;
    }>(`/campaigns/${atlasId}/shortlists/${shortlistId}/brief`, file);
    return {
      file_name: data.fileName,
      uploaded_at: data.uploadedAt,
      extracted_criteria: data.extractedCriteria,
      byte_length: data.byteLength,
      extraction_note: data.extractionNote,
    };
  } catch (err) {
    rethrowAtlas(err);
  }
}

// ─── Communications ─────────────────────────────────────────────────────────

type AtlasCommsHealth = {
  totals: Record<string, number>;
  rates: Record<string, number>;
  byPlatform: {
    platformSlug: string;
    messages: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    failureRate: number;
  }[];
  byChannel: {
    channel: string;
    messages: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }[];
};

export async function getCommsOverview(id: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  const { data } = await atlasGet<AtlasCommsHealth>(`/campaigns/${atlasId}/communications`);
  return { totals: data.totals, rates: data.rates, by_channel: data.byChannel };
}

// Atlas has no per-platform "detail available" flag — treat every platform
// that has sent at least one message as drillable; a real drill-down needs
// the stage-detail endpoint underneath, which only exists for pipeline
// stages (not comms-only platforms like blastit), so restrict has_detail to
// platform slugs that are also registered pipeline stages for this campaign.
export async function getCommsPlatforms(id: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  const [{ data: comms }, stages] = await Promise.all([
    atlasGet<AtlasCommsHealth>(`/campaigns/${atlasId}/communications`),
    getPipelineStages(id),
  ]);
  const stageSlugSet = new Set(stages.map((s) => s.platform_slug));
  return comms.byPlatform.map((p) => ({
    platform_slug: p.platformSlug,
    sent: p.messages,
    delivered: p.delivered,
    failed: p.failed,
    delivery_rate: p.deliveryRate,
    failure_rate: p.failureRate,
    has_detail: stageSlugSet.has(p.platformSlug),
  }));
}

export async function getFlaggedCandidates(id: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  const { data } = await atlasGet<
    {
      campaignCandidateId: string;
      guid: string;
      displayName: string | null;
      channel: string;
      failedCount: number;
      lastFailureAt: string;
      messageTypes: string[];
      escalated: boolean;
    }[]
  >(`/campaigns/${atlasId}/communications/flags?limit=50`);
  return data.map((f) => ({
    id: f.campaignCandidateId,
    guid: f.guid,
    display_name: f.displayName,
    channel: f.channel,
    failed_count: f.failedCount,
    last_failure_at: f.lastFailureAt,
    message_types: f.messageTypes,
    escalated: f.escalated,
  }));
}

export async function getCandidateCommsProfile(id: string, guid: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasGet<{
      guid: string;
      campaignId: string;
      messages: {
        id: string;
        platformSlug: string;
        channel: string;
        messageType: string;
        currentState: string;
        createdAt: string;
        events: unknown[];
      }[];
    }>(`/candidates/${guid}/communications/${atlasId}`);
    return {
      guid: data.guid,
      messages: data.messages.map((m) => ({
        id: m.id,
        platform_slug: m.platformSlug,
        channel: m.channel,
        message_type: m.messageType,
        current_state: m.currentState,
        created_at: m.createdAt,
        events: m.events,
      })),
    };
  } catch (err) {
    if (err instanceof AtlasApiError && err.status === 404) return null;
    throw err;
  }
}

// ─── Reports ────────────────────────────────────────────────────────────────

type AtlasReportView = {
  id: string;
  reportType: 'STAGE' | 'CAMPAIGN' | 'CUSTOM';
  scopeSlug: string | null;
  title: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
  version: number;
  isCurrent: boolean;
  generatedBy: string;
  prompt: string | null;
  generatedAt: string;
  error: string | null;
  data: unknown | null;
};

export async function getReports(id: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  const { data } = await atlasGet<AtlasReportView[]>(
    `/campaigns/${atlasId}/reports?currentOnly=true`,
  );
  return data.map((r) => ({
    id: r.id,
    report_type: r.reportType,
    scope_slug: r.scopeSlug,
    title: r.title,
    status: r.status,
    version: r.version,
    generated_by: r.generatedBy,
    prompt: r.prompt,
    generated_at: r.generatedAt,
    error: r.error,
  }));
}

type AtlasReportData = {
  title: string;
  reportType: 'STAGE' | 'CAMPAIGN' | 'CUSTOM';
  generatedAt: string;
  campaign: {
    id: string;
    externalId: string;
    name: string;
    clientName: string;
    campaignType: string;
    status: string;
  };
  // summary/sections are already single-word-keyed on Atlas's side (label,
  // value, unit, kind, heading, metrics, columns, rows, key, align) — no
  // camelCase fields to reshape, unlike the ones above.
  summary: unknown[];
  sections: unknown[];
  narrative?: string[];
};

function reshapeReportData(raw: AtlasReportData | null) {
  if (raw === null) return null;
  return {
    title: raw.title,
    report_type: raw.reportType,
    generated_at: raw.generatedAt,
    campaign: {
      id: raw.campaign.id,
      external_id: raw.campaign.externalId,
      name: raw.campaign.name,
      client_name: raw.campaign.clientName,
      campaign_type: raw.campaign.campaignType,
      status: raw.campaign.status,
    },
    summary: raw.summary,
    sections: raw.sections,
    narrative: raw.narrative,
  };
}

export async function getReportById(id: string, reportId: string) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasGet<AtlasReportView & { data: AtlasReportData | null }>(
      `/campaigns/${atlasId}/reports/${reportId}`,
    );
    return {
      id: data.id,
      report_type: data.reportType,
      scope_slug: data.scopeSlug,
      title: data.title,
      status: data.status,
      prompt: data.prompt,
      generated_at: data.generatedAt,
      error: data.error,
      data: reshapeReportData(data.data),
    };
  } catch (err) {
    if (err instanceof AtlasApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getReportExport(id: string, reportId: string, format: 'pdf' | 'excel') {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  return atlasGetRaw(`/campaigns/${atlasId}/reports/${reportId}/export?format=${format}`);
}

export async function generateReport(
  id: string,
  input: {
    report_type: 'STAGE' | 'CAMPAIGN' | 'CUSTOM';
    scope_slug?: string;
    prompt?: string;
    title?: string;
    include_candidates?: boolean;
    generated_by: string;
  },
) {
  const campaign = await loadCampaign(id);
  const atlasId = requireAtlasCampaignId(campaign);
  try {
    const { data } = await atlasPost<AtlasReportView>(`/campaigns/${atlasId}/reports`, {
      reportType: input.report_type,
      ...(input.scope_slug ? { scopeSlug: input.scope_slug } : {}),
      ...(input.prompt ? { prompt: input.prompt } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.include_candidates !== undefined ? { includeCandidates: input.include_candidates } : {}),
      generatedBy: input.generated_by,
    });
    return {
      id: data.id,
      report_type: data.reportType,
      scope_slug: data.scopeSlug,
      title: data.title,
      status: data.status,
      prompt: data.prompt,
      generated_at: data.generatedAt,
      error: data.error,
    };
  } catch (err) {
    rethrowAtlas(err);
  }
}

