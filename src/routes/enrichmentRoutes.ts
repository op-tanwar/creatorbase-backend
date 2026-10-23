import { Router } from 'express';
import multer from 'multer';
import { EnrichmentController } from '../controllers/enrichmentController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Configure in-memory upload handler with 5MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size
  },
});

router.use(requireAuth);

router.get('/quota', EnrichmentController.getQuota);
router.post('/upload', upload.single('file'), EnrichmentController.uploadCsv);
router.get('/job/:id', EnrichmentController.getJobStatus);
router.get('/job/:id/export', EnrichmentController.exportEnrichedCsv);

export default router;
