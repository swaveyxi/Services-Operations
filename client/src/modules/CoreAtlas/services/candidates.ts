import { api } from '@/services/api';
import type { Candidate, CandidateProfile, PipelineDistribution, PipelineStage } from '../types';

export async function getCandidates(id: string): Promise<Candidate[]> {
  const res = await api.get(`/atlas/campaigns/${id}/candidates`);
  const body: { candidates: Candidate[] } = await res.json();
  return body.candidates;
}

export async function getCandidateById(id: string, candidateId: string): Promise<CandidateProfile | null> {
  const res = await api.get(`/atlas/campaigns/${id}/candidates/${candidateId}`).catch(() => null);
  if (!res) return null;
  return res.json();
}

export async function getPipelineDistribution(id: string): Promise<PipelineDistribution> {
  const res = await api.get(`/atlas/campaigns/${id}/candidates/distribution`);
  return res.json();
}

// Whether a candidate has reached/passed a given pipeline stage. Derived from
// the candidate's own current_stage_slug/current_platform_status against the
// campaign's real stage order — not a fixed 4-value enum, since the real
// pipeline can have any number of platform stages in any order.
export function candidateJourneyStatus(
  candidate: Candidate,
  stages: PipelineStage[],
  platformSlug: string,
): 'completed' | 'in_progress' | 'awaiting' {
  const stage = stages.find((s) => s.platform_slug === platformSlug);
  const currentStage = stages.find((s) => s.platform_slug === candidate.current_stage_slug);
  if (!stage) return 'awaiting';
  if (!currentStage) return candidate.status === 'WITHDRAWN' ? 'awaiting' : 'in_progress';
  if (currentStage.stage_order > stage.stage_order) return 'completed';
  if (currentStage.stage_order < stage.stage_order) return 'awaiting';
  return candidate.current_platform_status === 'COMPLETED' ? 'completed' : 'in_progress';
}
