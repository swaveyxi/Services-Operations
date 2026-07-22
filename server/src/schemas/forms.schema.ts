import { z } from 'zod';
import { FORM_CATALOG_META, DELIVERY_STATUSES } from '../../../shared/constants';

const FORM_TYPES = Object.values(FORM_CATALOG_META).map((m) => m.title) as [string, ...string[]];

export const CreateFormSchema = z.object({
  campaign_id: z.string().uuid(),
  form_type: z.enum(FORM_TYPES),
  operations_team: z.string().min(1).max(100),
  form_details: z.record(z.string(), z.unknown()).optional().nullable(),
  delivery_status: z.enum([...DELIVERY_STATUSES]).optional(),
  submitted_on: z.string().datetime().optional(),
});

const OneDriveFileSchema = z.object({
  id: z.string().min(1),
  drive_id: z.string().min(1),
  name: z.string().max(255),
  web_url: z.string().max(2000),
  mime_type: z.string().max(255).optional(),
  size: z.number().optional(),
});

const AttachmentSchema = z.array(OneDriveFileSchema);

export type AttachmentInput = z.infer<typeof AttachmentSchema>;

export const PatchFormSchema = z
  .object({
    action: z
      .enum(['deliver', 'acknowledge', 'handoff', 'complete-handoff', 'acknowledge-handoff'])
      .optional(),
    handoff_team: z.string().min(1).max(100).optional(),
    handoff_id: z.string().uuid().optional(),
    attachment: AttachmentSchema.optional(),
    report: AttachmentSchema.optional(),
    note: z.string().max(1000).optional(),
    evidence: AttachmentSchema.optional(),
    form_details: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((d) => d.action !== 'handoff' || !!d.handoff_team, {
    message: 'handoff_team is required when action is "handoff".',
    path: ['handoff_team'],
  })
  .refine(
    (d) =>
      !['acknowledge-handoff', 'complete-handoff'].includes(d.action ?? '') || !!d.handoff_id,
    { message: 'handoff_id is required for this action.', path: ['handoff_id'] },
  );
