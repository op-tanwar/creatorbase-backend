import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../utils/prisma';
import { PlanType, SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { CreateOrderInput, VerifyPaymentInput } from '../validators/paymentSchemas';

// Strictly backend-computed prices in Paise (1 INR = 100 Paise)
export const PLAN_PRICING_PAISE = {
  STARTER: {
    monthly: 299900, // ₹2,999 / mo
    annual: 2878800, // ₹2,399/mo * 12 = ₹28,788
  },
  PRO: {
    monthly: 799900, // ₹7,999 / mo
    annual: 7678800, // ₹6,399/mo * 12 = ₹76,788
  },
} as const;

export class PaymentService {
  private static razorpayInstance: Razorpay | null = null;

  private static getRazorpayClient(): Razorpay {
    if (!this.razorpayInstance) {
      this.razorpayInstance = new Razorpay({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpayKeySecret,
      });
    }
    return this.razorpayInstance;
  }

  /**
   * 1. Create a Razorpay Order strictly with backend-calculated amounts
   */
  static async createOrder(userId: string, input: CreateOrderInput) {
    const { plan, billingCycle } = input;
    const amount = PLAN_PRICING_PAISE[plan][billingCycle];
    const currency = 'INR';

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const receipt = `rcpt_${userId.substring(0, 8)}_${Date.now().toString().slice(-6)}`;

    let orderId: string;

    try {
      const client = this.getRazorpayClient();
      const razorpayOrder = await client.orders.create({
        amount,
        currency,
        receipt,
        notes: {
          userId,
          plan,
          billingCycle,
          userEmail: user.email,
        },
      });
      orderId = razorpayOrder.id;
    } catch (err: any) {
      // In sandbox/development when running with mock test keys
      if (config.razorpayKeySecret.startsWith('mock_') || config.razorpayKeyId.startsWith('rzp_test_')) {
        orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      } else {
        throw new Error(`Razorpay Order creation failed: ${err.message || 'Gateway error'}`);
      }
    }

    // Save transaction in database with CREATED status
    const payment = await prisma.payment.create({
      data: {
        userId,
        orderId,
        amount,
        currency,
        plan,
        status: PaymentStatus.CREATED,
      },
    });

    return {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      plan: payment.plan,
      keyId: config.razorpayKeyId,
      user: {
        name: user.name,
        email: user.email,
        companyName: user.companyName,
      },
    };
  }

  /**
   * 2. Cryptographic HMAC SHA-256 verification of Razorpay signature
   */
  static async verifyPayment(userId: string, input: VerifyPaymentInput) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;

    // Locate matching order in database
    const payment = await prisma.payment.findUnique({
      where: { orderId: razorpay_order_id },
      include: { user: true },
    });

    if (!payment) {
      const error: any = new Error('Order not found or invalid order ID');
      error.statusCode = 404;
      throw error;
    }

    if (payment.userId !== userId) {
      const error: any = new Error('Unauthorized: payment does not belong to current user');
      error.statusCode = 403;
      throw error;
    }

    // Idempotency check: if already verified, return updated user immediately without passwordHash
    if (payment.status === PaymentStatus.SUCCESS) {
      const sanitizedUser = await prisma.user.findUnique({
        where: { id: payment.userId },
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          role: true,
          planType: true,
          subscriptionStatus: true,
          planExpiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return {
        success: true,
        message: 'Subscription is already active',
        user: sanitizedUser,
      };
    }

    // Generate expected HMAC SHA-256 signature
    const dataToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(dataToSign)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    let isSignatureValid = false;
    try {
      const generatedBuffer = Buffer.from(generatedSignature, 'utf-8');
      const receivedBuffer = Buffer.from(razorpay_signature, 'utf-8');

      if (generatedBuffer.length === receivedBuffer.length) {
        isSignatureValid = crypto.timingSafeEqual(generatedBuffer, receivedBuffer);
      }
    } catch {
      isSignatureValid = false;
    }

    // Developer sandbox fallback for test environments with mock secret
    if (!isSignatureValid && config.razorpayKeySecret.startsWith('mock_')) {
      if (
        razorpay_signature.startsWith('mock_') ||
        razorpay_signature === 'success_test_signature' ||
        razorpay_payment_id.startsWith('pay_')
      ) {
        isSignatureValid = true;
      }
    }

    if (!isSignatureValid) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      const error: any = new Error('Invalid Razorpay cryptographic signature');
      error.statusCode = 400;
      throw error;
    }

    // Determine subscription duration: Annual (> 1,000,000 paise) = 365 days, Monthly = 30 days
    const isAnnual = payment.amount > 1000000;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (isAnnual ? 365 : 30));

    // Update payment record to SUCCESS
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      },
    });

    // Upgrade user plan and active status
    const targetPlan = payment.plan === 'STARTER' ? PlanType.STARTER : PlanType.PRO;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        planType: targetPlan,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        planExpiresAt: expiresAt,
      },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        role: true,
        planType: true,
        subscriptionStatus: true,
        planExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: `Welcome to CreatorBase ${payment.plan}! Your subscription is now active.`,
      user: updatedUser,
    };
  }

  /**
   * 3. Handle asynchronous Razorpay Webhooks (order.paid, payment.captured)
   */
  static async handleWebhook(rawBody: string, signature: string) {
    if (!signature) {
      throw new Error('Missing x-razorpay-signature header');
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayWebhookSecret)
      .update(rawBody)
      .digest('hex');

    let isValid = false;
    try {
      const generatedBuffer = Buffer.from(expectedSignature, 'utf-8');
      const receivedBuffer = Buffer.from(signature, 'utf-8');
      if (generatedBuffer.length === receivedBuffer.length) {
        isValid = crypto.timingSafeEqual(generatedBuffer, receivedBuffer);
      }
    } catch {
      isValid = false;
    }

    // Sandbox fallback for development mock webhooks
    if (!isValid && config.razorpayWebhookSecret.startsWith('mock_')) {
      isValid = true;
    }

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === 'order.paid' || event === 'payment.captured') {
      const orderData = payload.payload?.order?.entity || payload.payload?.payment?.entity;
      const orderId = orderData?.order_id || orderData?.id;
      const paymentId = payload.payload?.payment?.entity?.id || `pay_wh_${Date.now()}`;

      if (orderId) {
        const payment = await prisma.payment.findUnique({
          where: { orderId },
        });

        // Idempotency: skip if already SUCCESS
        if (payment && payment.status !== PaymentStatus.SUCCESS) {
          const isAnnual = payment.amount > 1000000;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + (isAnnual ? 365 : 30));

          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              paymentId,
            },
          });

          const targetPlan = payment.plan === 'STARTER' ? PlanType.STARTER : PlanType.PRO;

          await prisma.user.update({
            where: { id: payment.userId },
            data: {
              planType: targetPlan,
              subscriptionStatus: SubscriptionStatus.ACTIVE,
              planExpiresAt: expiresAt,
            },
          });
        }
      }
    }

    return { received: true };
  }
}
