import { Router } from 'express';
import { handleCallback } from '../controllers/qbConnect.controller';

// Mounted outside verifyToken in index.ts — Intuit's redirect back to us is
// a plain browser navigation, not an authenticated API call.
const router = Router();

router.get('/callback', handleCallback);

export default router;
