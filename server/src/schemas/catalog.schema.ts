import { z } from 'zod';
import { BUSINESS_UNITS } from '../../../shared/constants';

export const UnitSchema = z.enum([...BUSINESS_UNITS]);

// Feeds directly into campaign_id generation (e.g. "DRGLTD/JULY/2026") — no
// spaces or punctuation that would break that format.
const AbbreviationSchema = z
  .string()
  .max(20)
  .regex(/^[A-Za-z0-9-]*$/, 'Abbreviation can only contain letters, numbers, and hyphens (no spaces).');

export const AddClientSchema = z.object({
  display_name: z.string().min(1).max(255),
  company_name: z.string().max(255).optional().nullable(),
  abbreviation: AbbreviationSchema.optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});

export const PatchClientSchema = z.object({
  abbreviation: AbbreviationSchema.optional(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});
