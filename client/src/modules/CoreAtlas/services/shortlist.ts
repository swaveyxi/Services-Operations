import { api } from '@/services/api';
import type { MemberSource, Shortlist, ShortlistDetail, ShortlistQueryResult } from '../types';

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
