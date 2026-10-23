import { Request, Response, NextFunction } from 'express';
import { ContactService } from '../services/contactService';
import { InboundLeadInput } from '../validators/contactSchemas';

export class ContactController {
  static async submitInboundLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: InboundLeadInput = req.body;
      const lead = await ContactService.createInboundLead(data);

      res.status(201).json({
        success: true,
        message: 'Consultation request received! Our campaign specialist will contact you within 2 hours.',
        data: {
          id: lead.id,
          createdAt: lead.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
