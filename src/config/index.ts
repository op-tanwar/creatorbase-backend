import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:pass@ep-host.ap-southeast-1.neon.tech/neondb?sslmode=require',
  jwtSecret: process.env.JWT_SECRET || 'super-secure-jwt-secret-key-at-least-32-chars-creatorbase-2026',
  jwtExpiresIn: '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_51aBcDeFgHiJkL',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret_key_creatorbase_rzp_2026',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret_creatorbase_2026',
};
