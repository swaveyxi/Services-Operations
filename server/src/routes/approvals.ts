import { Router } from 'express';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import { ApproveCampaignSchema, RejectCampaignSchema } from '../schemas/approvals.schema';
import { listPendingApprovals, approve, reject } from '../controllers/approvals.controller';
import { MD_ROLE } from '@shared/constants';

const router = Router();

router.use(requireRole(MD_ROLE));

router.get('/', listPendingApprovals);
router.post('/:id/approve', validate(ApproveCampaignSchema), approve);
router.post('/:id/reject', validate(RejectCampaignSchema), reject);

export default router;
