import express, { Router } from 'express';
import { listTeams, getTeam, getMyTeams, getTeamForms, getTeamHandoffs } from '../controllers/teams.controller';

const app = express();
const router = Router();

router.get('/', listTeams);
router.get('/mine', getMyTeams);
router.get('/:key', getTeam);
router.get('/:key/forms', getTeamForms);
router.get('/:key/handoffs', getTeamHandoffs);

export default router;
