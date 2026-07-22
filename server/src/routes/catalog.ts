import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { AddClientSchema, PatchClientSchema } from '../schemas/catalog.schema';
import {
  listClients,
  getClient,
  addClient,
  patchClient,
  getServiceCatalog,
  listWorkplanTemplates,
} from '../controllers/catalog.controller';

const router = Router();

router.get('/clients', listClients);
router.get('/clients/:id', getClient);
router.post('/clients', validate(AddClientSchema), addClient);
router.patch('/clients/:id', validate(PatchClientSchema), patchClient);
router.get('/service-catalog', getServiceCatalog);
router.get('/workplan-templates', listWorkplanTemplates);

export default router;
