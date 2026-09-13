import { Router } from 'express';
import multer from 'multer';
import {
  getCampaign,
  getPipelineStages,
  getCandidates,
  getPipelineDistribution,
  getCandidateById,
  listShortlists,
  createShortlist,
  getShortlistDetail,
  queryShortlist,
  addShortlistMembers,
  removeShortlistMember,
  lockShortlist,
  progressShortlist,
  uploadShortlistCandidates,
  uploadShortlistBrief,
  getCommsOverview,
  getCommsPlatforms,
  getFlaggedCandidates,
  getCandidateCommsProfile,
  getReports,
  getReportById,
  getReportExport,
  generateReport,
} from '../controllers/atlas.controller';

const router = Router();

// Files are only ever forwarded to Atlas, never persisted locally — memory
// storage, no disk writes. 10MB comfortably covers Atlas's own 10,000-row
// CSV cap and any brief document.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/campaigns/:id', getCampaign);
router.get('/campaigns/:id/stages', getPipelineStages);
router.get('/campaigns/:id/candidates', getCandidates);
router.get('/campaigns/:id/candidates/distribution', getPipelineDistribution);
router.get('/campaigns/:id/candidates/:candidateId', getCandidateById);
router.get('/campaigns/:id/shortlists', listShortlists);
router.post('/campaigns/:id/shortlists', createShortlist);
router.get('/campaigns/:id/shortlists/:shortlistId', getShortlistDetail);
router.post('/campaigns/:id/shortlists/:shortlistId/query', queryShortlist);
router.post('/campaigns/:id/shortlists/:shortlistId/members', addShortlistMembers);
router.delete('/campaigns/:id/shortlists/:shortlistId/members/:memberId', removeShortlistMember);
router.post('/campaigns/:id/shortlists/:shortlistId/lock', lockShortlist);
router.post('/campaigns/:id/shortlists/:shortlistId/progress', progressShortlist);
router.post('/campaigns/:id/shortlists/:shortlistId/upload-candidates', upload.single('file'), uploadShortlistCandidates);
router.post('/campaigns/:id/shortlists/:shortlistId/brief', upload.single('file'), uploadShortlistBrief);
router.get('/campaigns/:id/communications', getCommsOverview);
router.get('/campaigns/:id/communications/platforms', getCommsPlatforms);
router.get('/campaigns/:id/communications/flags', getFlaggedCandidates);
router.get('/campaigns/:id/communications/candidates/:guid', getCandidateCommsProfile);
router.get('/campaigns/:id/reports', getReports);
router.post('/campaigns/:id/reports', generateReport);
router.get('/campaigns/:id/reports/:reportId', getReportById);
router.get('/campaigns/:id/reports/:reportId/export', getReportExport);

export default router;
