import { api } from '@/services/api';
import type { ReportSummary, ReportDetail } from '../types';

export async function getReports(id: string): Promise<ReportSummary[]> {
  const res = await api.get(`/atlas/campaigns/${id}/reports`);
  return res.json();
}

export async function getReportById(id: string, reportId: string): Promise<ReportDetail | null> {
  const res = await api.get(`/atlas/campaigns/${id}/reports/${reportId}`).catch(() => null);
  if (!res) return null;
  return res.json();
}

// The export endpoint returns a raw file, not JSON — the caller navigates to
// (or opens) this URL directly rather than fetching it through `api`.
export function getReportExportUrl(id: string, reportId: string, format: 'pdf' | 'excel'): string {
  return `/api/atlas/campaigns/${id}/reports/${reportId}/export?format=${format}`;
}

export async function generateReport(
  id: string,
  input: { report_type: 'STAGE' | 'CAMPAIGN' | 'CUSTOM'; scope_slug?: string; prompt?: string; title?: string },
): Promise<ReportSummary> {
  const res = await api.post(`/atlas/campaigns/${id}/reports`, input);
  return res.json();
}
