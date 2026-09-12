import type { JobsReport } from '@shared/types';
import { api } from './api';

export async function getJobsReport(): Promise<JobsReport> {
  const res = await api.get('/reports/jobs');
  return res.json();
}
