import { Router } from 'express';
import { ContactController } from '../controllers/contactController';
import { validateBody } from '../middleware/validate';
import { inboundLeadSchema } from '../validators/contactSchemas';
import rateLimit from 'express-rate-limit';

const router = Router();

const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many requests. Please try again after a few minutes or email us directly at support@creatorbase.in.',
    errors: null,
  },
});

router.post(
  '/inbound',
  contactRateLimiter,
  validateBody(inboundLeadSchema),
  ContactController.submitInboundLead
);

export default router;
