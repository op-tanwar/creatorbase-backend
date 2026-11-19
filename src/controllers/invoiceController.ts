import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { InvoiceService } from '../services/invoiceService';

export class InvoiceController {
  static async createInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { amount, planName, clientGstin, clientName, clientAddress, paymentId } = req.body;

      if (!amount) {
        res.status(400).json({ success: false, message: 'amount is required' });
        return;
      }

      const invoice = await InvoiceService.createInvoice({
        userId,
        amount: parseFloat(amount),
        planName,
        clientGstin,
        clientName,
        clientAddress,
        paymentId,
      });

      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getInvoices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const invoices = await InvoiceService.getInvoices(userId);
      res.status(200).json({
        success: true,
        data: invoices,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getInvoiceById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const invoiceId = String(req.params.id);
      const invoice = await InvoiceService.getInvoiceById(userId, invoiceId);
      res.status(200).json({
        success: true,
        data: invoice,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getInvoiceHtml(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const invoiceId = String(req.params.id);
      const invoice = await InvoiceService.getInvoiceById(userId, invoiceId);
      const html = InvoiceService.generateInvoiceHtml(invoice);
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } catch (err) {
      next(err);
    }
  }
}
