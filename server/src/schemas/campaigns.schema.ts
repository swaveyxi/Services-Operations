import { z } from 'zod';
import { BUSINESS_UNITS } from '../../../shared/constants';

const UnitSchema = z.enum([...BUSINESS_UNITS]);

const LineItemSchema = z.object({
  // Present when editing an existing row (identifies it for update); absent for a new item.
  id: z.string().uuid().optional(),
  service_income_id: z.string().uuid().optional().nullable(),
  service_cost_id: z.string().uuid().optional().nullable(),
  service_name: z.string().min(1).max(255),
  acct_num: z.string().max(20).optional().nullable(),
  parent_account: z.string().max(100).optional().nullable(),
  quantity: z.coerce.number().nonnegative(),
  rate: z.coerce.number().nonnegative(),
});

export const CreateCampaignSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  unit: UnitSchema,
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  revenue_items: z.array(LineItemSchema).optional(),
  cost_items: z.array(LineItemSchema).optional(),
});

export const PatchCampaignSchema = z
  .object({
    revenue_items: z.array(LineItemSchema).optional(),
    cost_items: z.array(LineItemSchema).optional(),
    client_id: z.string().uuid().optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
  })
  .refine(
    (d) => d.revenue_items !== undefined || d.cost_items !== undefined || d.client_id !== undefined || d.description !== undefined,
    { message: 'No updatable fields provided.' },
  );
