import { Request, Response } from 'express';
import createError from 'http-errors';
import { findLegacyAttachmentById } from '../models/legacyAttachments';

// GET /api/legacy-uploads/:id
export async function getLegacyAttachment(req: Request, res: Response): Promise<void> {
  const attachment = await findLegacyAttachmentById(String(req.params.id));
  if (!attachment) throw createError(404, 'Attachment not found.');

  res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename.replace(/"/g, '')}"`);
  res.send(Buffer.from(attachment.content, 'base64'));
}
