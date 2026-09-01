import { Router } from 'express';
import { getSession, deleteSession, revokeSession } from '../controllers/auth.controller';

const router = Router();

router.get('/session', getSession);
router.delete('/session', deleteSession);
router.post('/revoke', revokeSession);

export default router;
