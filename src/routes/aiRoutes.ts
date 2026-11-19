import { Router } from 'express';
import { AIMatcherController } from '../controllers/aiMatcherController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/match-brief', AIMatcherController.matchBrief);
router.post('/discover', AIMatcherController.discover);

export default router;
