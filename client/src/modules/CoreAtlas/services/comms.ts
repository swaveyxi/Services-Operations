import { api } from '@/services/api';
import type { CommsOverview, CommsPlatform, FlaggedCandidate, CandidateCommsProfile } from '../types';

export async function getCommsOverview(id: string): Promise<CommsOverview> {
  const res = await api.get(`/atlas/campaigns/${id}/communications`);
  return res.json();
}

export async function getCommsPlatforms(id: string): Promise<CommsPlatform[]> {
  const res = await api.get(`/atlas/campaigns/${id}/communications/platforms`);
  return res.json();
}

export async function getFlaggedCandidates(id: string): Promise<FlaggedCandidate[]> {
  const res = await api.get(`/atlas/campaigns/${id}/communications/flags`);
  return res.json();
}

// Real Atlas has no per-platform "batches"/"escalations" concept (that was a
// mock-only construct) — the platform detail view is just the aggregate row
// from getCommsPlatforms, one call reused rather than duplicated.
export async function getPlatformDetail(id: string, platformSlug: string): Promise<CommsPlatform | null> {
  const platforms = await getCommsPlatforms(id);
  return platforms.find((p) => p.platform_slug === platformSlug) ?? null;
}

export async function getCandidateCommsProfile(id: string, guid: string): Promise<CandidateCommsProfile | null> {
  const res = await api.get(`/atlas/campaigns/${id}/communications/candidates/${guid}`).catch(() => null);
  if (!res) return null;
  return res.json();
}
