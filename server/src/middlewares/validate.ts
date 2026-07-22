import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';

const FIELD_LABELS: Record<string, string> = {
  attachment: 'Attachment',
  'attachment.value': 'Attachment URL',
  'attachment.type': 'Attachment type',
  report: 'Report',
  'report.value': 'Report URL',
  evidence: 'Evidence',
  'evidence.value': 'Evidence URL',
  handoff_team: 'Receiving team',
  handoff_id: 'Handoff',
  action: 'Action',
  delivery_status: 'Delivery status',
  form_details: 'Form details',
  note: 'Note',
  form_type: 'Form type',
  campaign_id: 'Campaign',
  operations_team: 'Operations team',
};

function friendlyIssue(issue: { path: PropertyKey[]; message: string }): string {
  const path = issue.path.map(String).join('.');
  const label = FIELD_LABELS[path];
  const msg = issue.message;

  if (!label) return msg;

  // Normalise Zod v4's generic messages to plain English
  if (/invalid type|expected|required/i.test(msg)) return `${label} is required.`;
  if (/too small|too short/i.test(msg)) return `${label} is required.`;
  if (/too big|too long/i.test(msg)) return `${label} is too long.`;
  if (/invalid/i.test(msg)) return `${label} has an invalid value.`;

  return `${label}: ${msg}`;
}

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = (result.error.issues as { path: PropertyKey[]; message: string }[]).map(friendlyIssue).join(' ');
      throw createError(400, message);
    }
    req.body = result.data;
    next();
  };
