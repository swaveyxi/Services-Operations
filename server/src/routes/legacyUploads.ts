import { Router } from 'express';
import { getLegacyAttachment } from '../controllers/legacyAttachments.controller';

const router = Router();

router.get('/:id', getLegacyAttachment);

export default router;
