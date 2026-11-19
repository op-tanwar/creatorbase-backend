import { Router } from 'express';
import { CreatorController } from '../controllers/creatorController';
import { requireAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { creatorQuerySchema } from '../validators/creatorSchemas';

const router = Router();

// Public read-only directory endpoint for Programmatic SEO (no auth required)
router.get('/public/directory', CreatorController.getPublicDirectory);

router.use(requireAuth);

router.get('/', validateQuery(creatorQuerySchema), CreatorController.getCreators);
router.post('/sync-live', CreatorController.syncLiveCreator);
router.post('/bulk-seed-apify', CreatorController.bulkSeedApify);
router.get('/:id', CreatorController.getCreatorById);
router.get('/:id/analytics', CreatorController.getCreatorAnalytics);
router.get('/:id/audit', CreatorController.getCreatorAudit);
router.get('/:id/lookalikes', CreatorController.getCreatorLookalikes);

export default router;
