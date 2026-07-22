import { z } from 'zod';
import { BUSINESS_UNITS } from '../../../shared/constants';

export const UnitSchema = z.enum([...BUSINESS_UNITS]);

export const AddClientSchema = z.object({
  display_name: z.string().min(1).max(255),
  company_name: z.string().max(255).optional().nullable(),
  abbreviation: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});

export const PatchClientSchema = z.object({
  abbreviation: z.string().max(20).optional(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});
