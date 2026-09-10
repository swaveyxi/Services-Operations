import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { CreateCampaignSchema, PatchCampaignSchema } from '../schemas/campaigns.schema';
import {
  listCampaigns,
  listArchived,
  getCampaign,
  createCampaign,
  patchCampaign,
  submitCampaign,
  closeCampaign,
  archive,
  unarchive,
  removeCampaign,
  getCampaignWorkplans,
  getCampaignForms,
} from '../controllers/campaigns.controller';

const router = Router();

router.get('/', listCampaigns);
// Must precede '/:id' — otherwise Express matches "archived" as an :id param.
router.get('/archived', listArchived);
router.post('/', validate(CreateCampaignSchema), createCampaign);
router.get('/:id', getCampaign);
router.patch('/:id', validate(PatchCampaignSchema), patchCampaign);
router.post('/:id/submit', submitCampaign);
router.post('/:id/close', closeCampaign);
router.post('/:id/archive', archive);
router.post('/:id/unarchive', unarchive);
router.delete('/:id', removeCampaign);
router.get('/:id/workplans', getCampaignWorkplans);
router.get('/:id/forms', getCampaignForms);

export default router;
