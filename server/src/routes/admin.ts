import { Router } from 'express';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import {
  PatchUserRolesSchema,
  AddTeamMemberSchema,
  SetGroupEmailSchema,
  CreateTeamSchema,
} from '../schemas/admin.schema';
import {
  adminListCampaigns,
  adminListUsers,
  adminPatchUserRoles,
  adminDeactivateUser,
  adminListTeams,
  adminGetTeamMembers,
  adminAddTeamMember,
  adminRemoveTeamMember,
  adminSetGroupEmail,
  adminCreateTeam,
} from '../controllers/admin.controller';
import { SUPER_ADMIN_ROLE, OPERATIONS_ADMIN_ROLE, OPERATIONS_ROLE } from '@shared/constants';

const router = Router();

const orgReadRoles = [OPERATIONS_ROLE, OPERATIONS_ADMIN_ROLE, SUPER_ADMIN_ROLE];

router.get('/campaigns', requireRole(...orgReadRoles), adminListCampaigns);
router.get('/users', requireRole(...orgReadRoles), adminListUsers);

router.use(requireRole(SUPER_ADMIN_ROLE));
router.patch('/users/:id/roles', validate(PatchUserRolesSchema), adminPatchUserRoles);
router.delete('/users/:id', adminDeactivateUser);

router.get('/teams', adminListTeams);
router.post('/teams', validate(CreateTeamSchema), adminCreateTeam);
router.get('/teams/:key/members', adminGetTeamMembers);
router.post('/teams/:key/members', validate(AddTeamMemberSchema), adminAddTeamMember);
router.delete('/teams/:key/members/:user_id', adminRemoveTeamMember);
router.patch('/teams/:key/group-email', validate(SetGroupEmailSchema), adminSetGroupEmail);

export default router;
