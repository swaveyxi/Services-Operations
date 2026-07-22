import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { CreateFormSchema, PatchFormSchema } from '../schemas/forms.schema';
import { listForms, createForm, getForm, patchForm } from '../controllers/forms.controller';
import { requireRole } from '../middlewares/requireRole';
import { OPERATIONS_ROLE, OPERATIONS_ADMIN_ROLE, SUPER_ADMIN_ROLE } from '@shared/constants';

const router = Router();

router.get('/', requireRole(OPERATIONS_ROLE, OPERATIONS_ADMIN_ROLE, SUPER_ADMIN_ROLE), listForms);
router.post('/', validate(CreateFormSchema), createForm);
router.get('/:id', getForm);
router.patch('/:id', validate(PatchFormSchema), patchForm);

export default router;
