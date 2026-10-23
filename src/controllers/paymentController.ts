import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';
import { createOrderSchema, verifyPaymentSchema } from '../validators/paymentSchemas';
import { AuthenticatedRequest } from '../types';

export class PaymentController {
  static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const validated = createOrderSchema.parse(req.body);
      const order = await PaymentService.createOrder(userId, validated);

      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const validated = verifyPaymentSchema.parse(req.body);
      const result = await PaymentService.verifyPayment(userId, validated);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = (req.headers['x-razorpay-signature'] as string) || '';
      const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

      const result = await PaymentService.handleWebhook(rawBody, signature);

      res.status(200).json({
        status: 'ok',
        result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Webhook verification failed',
      });
    }
  }
}
