import { Router } from 'express';
import { requireRole } from '../middlewares/requireRole';
import { OPERATIONS_ROLE, OPERATIONS_ADMIN_ROLE, SUPER_ADMIN_ROLE } from '@shared/constants';
import { jobsReport } from '../controllers/reports.controller';

const router = Router();

router.get(
  '/jobs',
  requireRole(OPERATIONS_ROLE, OPERATIONS_ADMIN_ROLE, SUPER_ADMIN_ROLE),
  jobsReport,
);

export default router;
