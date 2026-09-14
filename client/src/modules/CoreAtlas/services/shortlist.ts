import { api } from '@/services/api';
import type {
  MemberSource,
  Shortlist,
  ShortlistBrief,
  ShortlistCandidateUploadResult,
  ShortlistDetail,
  ShortlistQueryResult,
} from '../types';

// The stable, deterministic identifier for a shortlist — used wherever it's
// referenced as a record (dropdown lists, CSV export filenames), as opposed
// to `name`, which is a free-text label an operator can set to anything.
// Campaign business keys (e.g. "ACCESS3/SEPTEMBER/2026") contain slashes,
// which are fine in on-screen text but not in a filename — `forFilename`
// swaps them for a safe separator.
export function formatShortlistIdentifier(
  campaignBusinessKey: string,
  platformSlug: string,
  version: number,
  { forFilename = false }: { forFilename?: boolean } = {},
): string {
  const key = forFilename ? campaignBusinessKey.replace(/[/\\]+/g, '-') : campaignBusinessKey;
  return `${key}-${platformSlug}-v${version}`;
}

export async function listShortlists(id: string, filters: { platform_slug?: string; status?: string } = {}): Promise<Shortlist[]> {
  const params = new URLSearchParams();
  if (filters.platform_slug) params.set('platformSlug', filters.platform_slug);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  const res = await api.get(`/atlas/campaigns/${id}/shortlists${qs ? `?${qs}` : ''}`);
  return res.json();
}

export async function getShortlistDetail(id: string, shortlistId: string): Promise<ShortlistDetail | null> {
  const res = await api.get(`/atlas/campaigns/${id}/shortlists/${shortlistId}`).catch(() => null);
  if (!res) return null;
  return res.json();
}

export async function createShortlist(id: string, platform_slug: string, name: string): Promise<Shortlist> {
  const res = await api.post(`/atlas/campaigns/${id}/shortlists`, { platform_slug, name });
  return res.json();
}

export async function queryShortlist(id: string, shortlistId: string, query: string): Promise<ShortlistQueryResult> {
  const res = await api.post(`/atlas/campaigns/${id}/shortlists/${shortlistId}/query`, { query });
  return res.json();
}

export async function addShortlistMembers(
  id: string,
  shortlistId: string,
  members: { campaign_candidate_id: string; source: MemberSource; match_reason?: string }[],
): Promise<{ added: number; updated: number; candidate_count: number }> {
  const res = await api.post(`/atlas/campaigns/${id}/shortlists/${shortlistId}/members`, { members });
  return res.json();
}

export async function removeShortlistMember(
  id: string,
  shortlistId: string,
  memberId: string,
): Promise<{ removed: boolean; candidate_count: number }> {
  const res = await api.del(`/atlas/campaigns/${id}/shortlists/${shortlistId}/members/${memberId}`);
  return res.json();
}

export async function lockShortlist(id: string, shortlistId: string): Promise<{ shortlist: Shortlist; superseded_ids: string[] }> {
  const res = await api.post(`/atlas/campaigns/${id}/shortlists/${shortlistId}/lock`, {});
  return res.json();
}

export async function discardShortlist(id: string, shortlistId: string): Promise<Shortlist> {
  const res = await api.post(`/atlas/campaigns/${id}/shortlists/${shortlistId}/discard`, {});
  return res.json();
}

export async function progressShortlist(
  id: string,
  shortlistId: string,
  destination_platform_slug: string,
  note?: string,
): Promise<{ progression_id: string; candidate_count: number; skipped_count: number }> {
  const res = await api.post(`/atlas/campaigns/${id}/shortlists/${shortlistId}/progress`, {
    destination_platform_slug,
    note,
  });
  return res.json();
}

export async function uploadShortlistCandidates(
  id: string,
  shortlistId: string,
  file: File,
): Promise<ShortlistCandidateUploadResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.postForm(`/atlas/campaigns/${id}/shortlists/${shortlistId}/upload-candidates`, fd);
  return res.json();
}

export async function uploadShortlistBrief(id: string, shortlistId: string, file: File): Promise<ShortlistBrief> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.postForm(`/atlas/campaigns/${id}/shortlists/${shortlistId}/brief`, fd);
  return res.json();
}
