import { Request, Response } from 'express';
import createError from 'http-errors';
import * as atlas from '../services/atlas.service';

// GET /api/atlas/campaigns/:id
export async function getCampaign(req: Request, res: Response): Promise<void> {
  res.json(await atlas.getCampaign(String(req.params.id)));
}

// GET /api/atlas/campaigns/:id/stages
export async function getPipelineStages(req: Request, res: Response): Promise<void> {
  res.json(await atlas.getPipelineStages(String(req.params.id)));
}

// GET /api/atlas/campaigns/:id/candidates
export async function getCandidates(req: Request, res: Response): Promise<void> {
  const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
  res.json(await atlas.getCandidates(String(req.params.id), { page, limit }));
}

// GET /api/atlas/campaigns/:id/candidates/distribution
export async function getPipelineDistribution(req: Request, res: Response): Promise<void> {
  res.json(await atlas.getPipelineDistribution(String(req.params.id)));
}

// GET /api/atlas/campaigns/:id/candidates/:candidateId
export async function getCandidateById(req: Request, res: Response): Promise<void> {
  const candidate = await atlas.getCandidateById(String(req.params.id), String(req.params.candidateId));
  if (!candidate) throw createError(404, 'Candidate not found.');
  res.json(candidate);
}

// GET /api/atlas/campaigns/:id/shortlists
export async function listShortlists(req: Request, res: Response): Promise<void> {
  const { platformSlug, status } = req.query as Record<string, string | undefined>;
  res.json(await atlas.listShortlists(String(req.params.id), { platform_slug: platformSlug, status }));
}

// POST /api/atlas/campaigns/:id/shortlists
export async function createShortlist(req: Request, res: Response): Promise<void> {
  const { platform_slug, name } = req.body;
  const shortlist = await atlas.createShortlist(String(req.params.id), {
    platform_slug,
    name,
    created_by: req.user!.name,
  });
  res.status(201).json(shortlist);
}

// GET /api/atlas/campaigns/:id/shortlists/:shortlistId
export async function getShortlistDetail(req: Request, res: Response): Promise<void> {
  const shortlist = await atlas.getShortlistDetail(String(req.params.id), String(req.params.shortlistId));
  if (!shortlist) throw createError(404, 'Shortlist not found.');
  res.json(shortlist);
}

// POST /api/atlas/campaigns/:id/shortlists/:shortlistId/query
export async function queryShortlist(req: Request, res: Response): Promise<void> {
  const { query, context_platform_slugs, max_results } = req.body;
  res.json(
    await atlas.queryShortlist(String(req.params.id), String(req.params.shortlistId), {
      query,
      context_platform_slugs,
      max_results,
    }),
  );
}

// POST /api/atlas/campaigns/:id/shortlists/:shortlistId/members
export async function addShortlistMembers(req: Request, res: Response): Promise<void> {
  const { members } = req.body;
  const result = await atlas.addShortlistMembers(String(req.params.id), String(req.params.shortlistId), members);
  res.status(201).json(result);
}

// DELETE /api/atlas/campaigns/:id/shortlists/:shortlistId/members/:memberId
export async function removeShortlistMember(req: Request, res: Response): Promise<void> {
  const result = await atlas.removeShortlistMember(
    String(req.params.id),
    String(req.params.shortlistId),
    String(req.params.memberId),
  );
  res.json(result);
}

// POST /api/atlas/campaigns/:id/shortlists/:shortlistId/lock
export async function lockShortlist(req: Request, res: Response): Promise<void> {
  const result = await atlas.lockShortlist(String(req.params.id), String(req.params.shortlistId), req.user!.name);
  res.json(result);
}

// POST /api/atlas/campaigns/:id/shortlists/:shortlistId/progress
export async function progressShortlist(req: Request, res: Response): Promise<void> {
  const { destination_platform_slug, note } = req.body;
  const result = await atlas.progressShortlist(String(req.params.id), String(req.params.shortlistId), {
    destination_platform_slug,
    progressed_by: req.user!.name,
    note,
  });
  res.status(201).json(result);
}

// POST /api/atlas/campaigns/:id/reports
export async function generateReport(req: Request, res: Response): Promise<void> {
  const { report_type, scope_slug, prompt, title } = req.body;
  const report = await atlas.generateReport(String(req.params.id), {
    report_type,
    scope_slug,
    prompt,
    title,
    generated_by: req.user!.name,
  });
  res.status(202).json(report);
}

// GET /api/atlas/campaigns/:id/communications
export async function getCommsOverview(req: Request, res: Response): Promise<void> {
  res.json(await atlas.getCommsOverview(String(req.params.id)));
}

// GET /api/atlas/campaigns/:id/communications/platforms
export async function getCommsPlatforms(req: Request, res: Response): Promise<void> {
  res.json(await atlas.getCommsPlatforms(String(req.params.id)));
}

// GET /api/atlas/campaigns/:id/communications/flags
export async function getFlaggedCandidates(req: Request, res: Response): Promise<void> {
  res.json(await atlas.getFlaggedCandidates(String(req.params.id)));
}

// GET /api/atlas/campaigns/:id/communications/candidates/:guid
export async function getCandidateCommsProfile(req: Request, res: Response): Promise<void> {
  const profile = await atlas.getCandidateCommsProfile(String(req.params.id), String(req.params.guid));
  if (!profile) throw createError(404, 'No communications found for this candidate.');
  res.json(profile);
}

// GET /api/atlas/campaigns/:id/reports
export async function getReports(req: Request, res: Response): Promise<void> {
  res.json(await atlas.getReports(String(req.params.id)));
}

// GET /api/atlas/campaigns/:id/reports/:reportId
export async function getReportById(req: Request, res: Response): Promise<void> {
  const report = await atlas.getReportById(String(req.params.id), String(req.params.reportId));
  if (!report) throw createError(404, 'Report not found.');
  res.json(report);
}

// GET /api/atlas/campaigns/:id/reports/:reportId/export
export async function getReportExport(req: Request, res: Response): Promise<void> {
  const format = req.query.format === 'excel' ? 'excel' : 'pdf';
  const file = await atlas.getReportExport(String(req.params.id), String(req.params.reportId), format);
  if (!file.ok) throw createError(file.status, 'Export failed.');
  if (file.contentType) res.set('content-type', file.contentType);
  if (file.contentDisposition) res.set('content-disposition', file.contentDisposition);
  res.send(Buffer.from(file.body));
}
