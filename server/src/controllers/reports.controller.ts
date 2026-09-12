import { Request, Response } from 'express';
import { getJobsReport } from '../services/jobsReport.service';

// GET /api/reports/jobs
export async function jobsReport(_req: Request, res: Response): Promise<void> {
  const report = await getJobsReport();
  res.json(report);
}
