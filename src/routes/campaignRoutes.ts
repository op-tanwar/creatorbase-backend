import { Router } from 'express';
import { CampaignController } from '../controllers/campaignController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createCampaignSchema } from '../validators/campaignSchemas';

const router = Router();

router.use(requireAuth);

router.get('/', CampaignController.getCampaigns);
router.post('/', validateBody(createCampaignSchema), CampaignController.createCampaign);
router.get('/:id', CampaignController.getCampaignById);

export default router;
