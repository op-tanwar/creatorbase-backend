import { Router } from 'express';
import { PitchController } from '../controllers/pitchController';

const router = Router();

// Unauthenticated public pitch endpoints
router.get('/:shareToken', PitchController.getPitch);
router.patch('/:shareToken/creators/:creatorId', PitchController.updateApproval);

export default router;
