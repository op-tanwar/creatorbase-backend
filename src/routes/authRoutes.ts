import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/authSchemas';
import { authRateLimiter } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login);
router.get('/me', requireAuth, AuthController.getMe);
router.put('/profile', requireAuth, validateBody(updateProfileSchema), AuthController.updateProfile);

export default router;
