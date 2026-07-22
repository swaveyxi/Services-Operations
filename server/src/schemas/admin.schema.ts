import { z } from 'zod';

export const PatchUserRolesSchema = z.object({
  action: z.enum(['grant', 'revoke']),
  role: z.string().min(1).max(50),
});

export const AddTeamMemberSchema = z.object({
  user_id: z.string().uuid(),
});

export const SetGroupEmailSchema = z.object({
  email: z.string().email().max(255).or(z.literal('').or(z.null())).nullable(),
});

export const CreateTeamSchema = z.object({
  team_key: z.string().min(1).max(50),
  team_name: z.string().min(1).max(100),
});
