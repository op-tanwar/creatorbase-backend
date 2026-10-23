import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createOrderSchema, verifyPaymentSchema } from '../validators/paymentSchemas';

const router = Router();

// Public webhook route (verified cryptographically via Razorpay signature)
router.post('/webhook', PaymentController.handleWebhook);

// Protected routes (JWT Auth required)
router.post('/create-order', requireAuth, validateBody(createOrderSchema), PaymentController.createOrder);
router.post('/verify', requireAuth, validateBody(verifyPaymentSchema), PaymentController.verifyPayment);

export default router;
