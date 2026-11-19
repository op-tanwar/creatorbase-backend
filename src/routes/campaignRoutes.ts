import { Router } from 'express';
import { CampaignController } from '../controllers/campaignController';
import { ContentMonitorController } from '../controllers/contentMonitorController';
import { AttributionController } from '../controllers/attributionController';
import { PayoutController } from '../controllers/payoutController';
import { ContractController } from '../controllers/contractController';
import { ProductSeedingController } from '../controllers/productSeedingController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createCampaignSchema } from '../validators/campaignSchemas';

const router = Router();

router.use(requireAuth);

router.get('/', CampaignController.getCampaigns);
router.post('/', validateBody(createCampaignSchema), CampaignController.createCampaign);
router.get('/:id', CampaignController.getCampaignById);

// Content Monitoring
router.post('/:id/track-post', ContentMonitorController.trackPost);
router.get('/:id/posts', ContentMonitorController.getCampaignPosts);
router.post('/:id/sync-metrics', ContentMonitorController.syncMetrics);
router.delete('/:id/posts/:postId', ContentMonitorController.deletePost);

// Attribution & UTM Tracking
router.post('/:id/attribution', AttributionController.createAttribution);
router.get('/:id/attribution', AttributionController.getCampaignAttributions);
router.post('/:id/attribution/:attributionId/record', AttributionController.recordMetric);
router.delete('/:id/attribution/:attributionId', AttributionController.deleteAttribution);

// Payout & TDS 194J/194C Ledger
router.post('/:id/payouts', PayoutController.createOrUpdatePayout);
router.get('/:id/payouts', PayoutController.getCampaignPayouts);
router.patch('/:id/payouts/:payoutId/settle', PayoutController.settlePayout);
router.delete('/:id/payouts/:payoutId', PayoutController.deletePayout);

// Creator Contracts & E-Sign
router.post('/:id/contracts', ContractController.createContract);
router.get('/:id/contracts', ContractController.getCampaignContracts);
router.patch('/:id/contracts/:contractId/status', ContractController.updateContractStatus);

// Product Seeding & Barter Shipments
router.post('/:id/seeding', ProductSeedingController.createSeeding);
router.get('/:id/seeding', ProductSeedingController.getCampaignSeedings);
router.patch('/:id/seeding/:seedingId/status', ProductSeedingController.updateSeedingStatus);
router.delete('/:id/seeding/:seedingId', ProductSeedingController.deleteSeeding);

export default router;
