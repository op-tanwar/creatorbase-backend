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
import aiRoutes from './aiRoutes';
import outreachRoutes from './outreachRoutes';
import invoiceRoutes from './invoiceRoutes';
import { AttributionController } from '../controllers/attributionController';
import { ContractController } from '../controllers/contractController';

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
router.use('/ai', aiRoutes);
router.use('/outreach', outreachRoutes);
router.use('/billing/invoices', invoiceRoutes);
router.get('/r/:campaignCode/:creatorSlug', AttributionController.handlePublicRedirect);
router.get('/public/contracts/:shareToken', ContractController.getPublicContract);
router.post('/public/contracts/:shareToken/sign', ContractController.signContract);

export default router;
