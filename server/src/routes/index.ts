import { Router } from 'express';
import catalogRouter from './catalog';
import campaignsRouter from './campaigns';
import workplansRouter from './workplans';
import formsRouter from './forms';
import teamsRouter from './teams';
import adminRouter from './admin';
import approvalsRouter from './approvals';
import quickbooksRouter from './quickbooks';
import legacyUploadsRouter from './legacyUploads';
import reportsRouter from './reports';

const router = Router();

// NOTE: '/auth' (session lifecycle) is mounted separately in index.ts, before
// the global verifyToken gate — establishing a session can't require one.
router.use(catalogRouter);
router.use('/campaigns', campaignsRouter);
router.use('/workplans', workplansRouter);
router.use('/forms', formsRouter);
router.use('/teams', teamsRouter);
router.use('/admin', adminRouter);
router.use('/approvals', approvalsRouter);
router.use('/quickbooks', quickbooksRouter);
router.use('/legacy-uploads', legacyUploadsRouter);
router.use('/reports', reportsRouter);

export default router;
