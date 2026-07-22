import { z } from 'zod';

export const ApproveCampaignSchema = z.object({
  note: z.string().max(1000).optional(),
});

export const RejectCampaignSchema = z.object({
  note: z.string().min(1).max(1000),
});
