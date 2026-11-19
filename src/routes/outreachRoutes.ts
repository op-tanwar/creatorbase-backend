import { Router } from 'express';
import { OutreachController } from '../controllers/outreachController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/send', OutreachController.sendPitch);
router.post('/bulk-send', OutreachController.bulkSend);
router.get('/threads', OutreachController.getThreads);
router.get('/threads/:id', OutreachController.getThreadById);
router.patch('/threads/:id/status', OutreachController.updateStatus);
router.post('/threads/:id/reply', OutreachController.reply);

export default router;
