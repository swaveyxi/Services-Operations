import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { CreateCampaignSchema, PatchCampaignSchema } from '../schemas/campaigns.schema';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  patchCampaign,
  submitCampaign,
  closeCampaign,
  getCampaignWorkplans,
  getCampaignForms,
} from '../controllers/campaigns.controller';

const router = Router();

router.get('/', listCampaigns);
router.post('/', validate(CreateCampaignSchema), createCampaign);
router.get('/:id', getCampaign);
router.patch('/:id', validate(PatchCampaignSchema), patchCampaign);
router.post('/:id/submit', submitCampaign);
router.post('/:id/close', closeCampaign);
router.get('/:id/workplans', getCampaignWorkplans);
router.get('/:id/forms', getCampaignForms);

export default router;
