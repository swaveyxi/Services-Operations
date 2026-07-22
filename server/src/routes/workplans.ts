import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { CreateWorkplanSchema, PatchWorkplanSchema } from '../schemas/workplans.schema';
import {
  listWorkplans,
  createWorkplan,
  patchWorkplan,
  deleteWorkplan,
} from '../controllers/workplans.controller';

const router = Router();

router.get('/', listWorkplans);
router.post('/', validate(CreateWorkplanSchema), createWorkplan);
router.patch('/:id', validate(PatchWorkplanSchema), patchWorkplan);
router.delete('/:id', deleteWorkplan);

export default router;
