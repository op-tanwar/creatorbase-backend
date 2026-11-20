import { Router } from 'express';
import { CreatorController } from '../controllers/creatorController';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { creatorQuerySchema } from '../validators/creatorSchemas';

const router = Router();

// Public & guest-accessible read endpoints with optional authentication
router.get('/public/directory', CreatorController.getPublicDirectory);
router.get('/', validateQuery(creatorQuerySchema), optionalAuth, CreatorController.getCreators);
router.get('/:id', optionalAuth, CreatorController.getCreatorById);
router.get('/:id/analytics', optionalAuth, CreatorController.getCreatorAnalytics);
router.get('/:id/audit', optionalAuth, CreatorController.getCreatorAudit);
router.get('/:id/lookalikes', optionalAuth, CreatorController.getCreatorLookalikes);

// Authenticated mutations
router.use(requireAuth);
router.post('/sync-live', CreatorController.syncLiveCreator);
router.post('/bulk-seed-apify', CreatorController.bulkSeedApify);

export default router;
