import { z } from 'zod';

// Accept YYYY-MM-DD or full ISO datetime
const isoDate = z.union([z.iso.date(), z.string().datetime()]);

export const CreateWorkplanSchema = z.object({
  campaign_id: z.string().uuid(),
  template_id: z.string().min(1).max(100),
  template_name: z.string().min(1).max(255),
  activities: z.array(z.unknown()).optional().nullable(),
  ops_start_date: isoDate.optional().nullable(),
  ops_end_date: isoDate.optional().nullable(),
});

export const PatchWorkplanSchema = z.object({
  action: z.enum(['submit', 'accept', 'amend']).optional(),
  activities: z.array(z.unknown()).optional().nullable(),
  ops_start_date: isoDate.optional().nullable(),
  ops_end_date: isoDate.optional().nullable(),
  template_name: z.string().min(1).max(255).optional(),
});
