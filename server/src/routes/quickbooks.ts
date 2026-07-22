import { Router } from 'express';
import { requireRole } from '../middlewares/requireRole';
import { startConnect, getStatus, triggerSync } from '../controllers/qbConnect.controller';
import { SUPER_ADMIN_ROLE } from '@shared/constants';

const router = Router();

router.use(requireRole(SUPER_ADMIN_ROLE));
router.get('/connect', startConnect);
router.get('/status', getStatus);
router.post('/sync', triggerSync);

export default router;
