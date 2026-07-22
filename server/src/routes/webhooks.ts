import { Router } from 'express';
import { quickbookEvent } from '../controllers/qbWebhook.controller';

const router = Router();

router.post('/quickbooks', quickbookEvent);

export default router;
