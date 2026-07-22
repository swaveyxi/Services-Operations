import { Router } from 'express';
import { createSession, getSession, deleteSession } from '../controllers/auth.controller';

const router = Router();

router.post('/session', createSession);
router.get('/session', getSession);
router.delete('/session', deleteSession);

export default router;
