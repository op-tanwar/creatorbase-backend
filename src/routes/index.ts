import { Router } from 'express';
import authRoutes from './authRoutes';
import creatorRoutes from './creatorRoutes';
import shortlistRoutes from './shortlistRoutes';
import campaignRoutes from './campaignRoutes';
import paymentRoutes from './paymentRoutes';
import adminRoutes from './adminRoutes';
import pitchRoutes from './pitchRoutes';
import contactRoutes from './contactRoutes';
import enrichmentRoutes from './enrichmentRoutes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CreatorBase API',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/creators', creatorRoutes);
router.use('/shortlists', shortlistRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/public/pitch', pitchRoutes);
router.use('/contact', contactRoutes);
router.use('/enrichment', enrichmentRoutes);

export default router;
